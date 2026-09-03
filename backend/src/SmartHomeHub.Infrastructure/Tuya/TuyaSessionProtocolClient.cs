using System.Buffers.Binary;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Tuya;

// Protocolo local Tuya v3.4 (frame 55AA, sessão HMAC-SHA256 + AES-ECB) e v3.5
// (frame 6699, sessão AES-GCM) — layout confirmado lendo o código-fonte real do
// tinytuya (message_helper.py/header.py/XenonDevice.py), não documentação de
// terceiros. Ver backend/tests/.../TestData/tuya-session-golden-vectors.json
// pros vetores de referência usados nos testes unitários.
//
// AVISO ANTI-VAZAMENTO: nenhum teste ou script deste componente deve conter o
// local_key real de um dispositivo do usuário — golden vectors usam sempre
// credenciais fake, geradas com o tinytuya rodando localmente (nunca commitado
// como dependência de produção).
public sealed class TuyaSessionProtocolClient : ITuyaProtocolClient
{
    private const int Port = 6668;
    private const int ConnectTimeoutMs = 2500;
    private const int ReceiveTimeoutMs = 2500;

    private const int CmdSessKeyNegStart = 3;
    private const int CmdSessKeyNegResp = 4;
    private const int CmdSessKeyNegFinish = 5;
    private const int CmdControl = 7; // legado — não usado no wire, só mantido p/ compat. dos testes de frame puro
    private const int CmdDpQuery = 0x0A; // idem

    // Comandos REAIS usados no wire, confirmados capturando tráfego real do
    // tinytuya (v3.5) em 2026-08-30: o dispositivo real ignora/derruba a
    // conexão se receber os códigos "clássicos" (7/0x0A) acima — ele espera
    // as variantes "New" mesmo falando local (não é exclusivo de nuvem).
    private const int CmdDpQueryNew = 0x10; // 16
    private const int CmdControlNew = 0x0D; // 13

    private const uint Prefix55Aa = 0x000055AA;
    private const uint Suffix55Aa = 0x0000AA55;
    private const uint Prefix6699 = 0x00006699;
    private static readonly byte[] Suffix6699 = [0x00, 0x00, 0x99, 0x66];

    private readonly bool _useGcm; // false = v3.4, true = v3.5
    private readonly ILogger<TuyaSessionProtocolClient> _logger;

    // Seams de teste: nonces fixos opcionais (produção usa RandomNumberGenerator).
    private readonly byte[]? _fixedLocalNonce;
    private readonly byte[]? _fixedGcmMessageIv;

    public TuyaSessionProtocolClient(
        bool useGcm,
        ILogger<TuyaSessionProtocolClient> logger,
        byte[]? fixedLocalNonceForTests = null,
        byte[]? fixedGcmMessageIvForTests = null
    )
    {
        _useGcm = useGcm;
        _logger = logger;
        _fixedLocalNonce = fixedLocalNonceForTests;
        _fixedGcmMessageIv = fixedGcmMessageIvForTests;
    }

    public async Task<IReadOnlyDictionary<int, object?>> QueryStatusAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        CancellationToken cancellationToken
    ) =>
        await ExecuteAsync(ipAddress, localKey, CmdDpQueryNew, "{}"u8.ToArray(), cancellationToken);

    public Task<IReadOnlyDictionary<int, object?>> SetDpAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        int dp,
        bool value,
        CancellationToken cancellationToken
    ) =>
        SetDpsAsync(
            ipAddress,
            tuyaDeviceId,
            localKey,
            new Dictionary<int, object> { [dp] = value },
            cancellationToken
        );

    public async Task<IReadOnlyDictionary<int, object?>> SetDpsAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        IReadOnlyDictionary<int, object> dps,
        CancellationToken cancellationToken
    )
    {
        // Formato "protocol 5" confirmado por captura real (não é {"dps":{...}} puro).
        var unixTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var dpsPayload = dps.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
        var json = JsonSerializer.Serialize(
            new
            {
                protocol = 5,
                t = unixTimestamp,
                data = new { dps = dpsPayload },
            }
        );
        return await ExecuteAsync(
            ipAddress,
            localKey,
            CmdControlNew,
            System.Text.Encoding.UTF8.GetBytes(json),
            cancellationToken
        );
    }

    private async Task<IReadOnlyDictionary<int, object?>> ExecuteAsync(
        string ipAddress,
        string localKey,
        int commandCode,
        byte[] commandPayload,
        CancellationToken cancellationToken
    )
    {
        var localKeyBytes = System.Text.Encoding.UTF8.GetBytes(localKey);

        using var tcpClient = new TcpClient();
        using var connectCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        connectCts.CancelAfter(ConnectTimeoutMs);
        await tcpClient.ConnectAsync(ipAddress, Port, connectCts.Token);

        using var stream = tcpClient.GetStream();

        var localNonce = _fixedLocalNonce ?? RandomNumberGenerator.GetBytes(16);
        var gcmIv = _fixedGcmMessageIv; // null => cada frame GCM gera nonce próprio abaixo

        var startFrame = BuildHandshakeStartFrame(
            _useGcm,
            localKeyBytes,
            localNonce,
            gcmIv ?? RandomNumberGenerator.GetBytes(12)
        );
        await SendAsync(stream, startFrame, cancellationToken);

        var respFrame = await ReceiveFrameAsync(stream, cancellationToken);
        var (remoteNonce, _) = ProcessHandshakeResponse(
            _useGcm,
            localKeyBytes,
            localNonce,
            respFrame
        );

        var finishFrame = BuildHandshakeFinishFrame(
            _useGcm,
            localKeyBytes,
            remoteNonce,
            gcmIv ?? RandomNumberGenerator.GetBytes(12)
        );
        await SendAsync(stream, finishFrame, cancellationToken);

        var sessionKey = DeriveSessionKey(_useGcm, localKeyBytes, localNonce, remoteNonce);

        var commandFrame = BuildCommandFrame(
            _useGcm,
            sessionKey,
            commandCode,
            commandPayload,
            seqno: 3,
            gcmIv ?? RandomNumberGenerator.GetBytes(12)
        );
        await SendAsync(stream, commandFrame, cancellationToken);

        var commandRespFrame = await ReceiveFrameAsync(stream, cancellationToken);
        return ParseCommandResponse(_useGcm, sessionKey, commandRespFrame);
    }

    private async Task SendAsync(NetworkStream stream, byte[] frame, CancellationToken ct)
    {
        _logger.LogDebug("SEND [{Length} bytes]: {Hex}", frame.Length, Convert.ToHexString(frame));
        await stream.WriteAsync(frame, ct);
        await stream.FlushAsync(ct);
    }

    private async Task<byte[]> ReceiveFrameAsync(NetworkStream stream, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(ReceiveTimeoutMs);

        var buffer = new byte[4096];
        var read = await stream.ReadAsync(buffer, timeoutCts.Token);
        _logger.LogDebug(
            "RECV [{Length} bytes]: {Hex}",
            read,
            Convert.ToHexString(buffer.AsSpan(0, Math.Max(read, 0)))
        );
        if (read <= 0)
        {
            throw new IOException("Conexão Tuya encerrada sem resposta.");
        }
        return buffer[..read];
    }

    // ---- Construção de frames (puro, sem I/O — usado direto pelos testes) ----

    public static byte[] BuildHandshakeStartFrame(
        bool useGcm,
        byte[] localKey,
        byte[] localNonce,
        byte[] gcmMessageIv
    ) =>
        useGcm
            ? PackGcmFrame(
                CmdSessKeyNegStart,
                seqno: 1,
                localKey,
                localNonce,
                gcmMessageIv,
                retcode: null
            )
            : PackHmacFrame(
                CmdSessKeyNegStart,
                seqno: 1,
                localKey,
                Aes_EncryptEcb(localKey, localNonce)
            );

    public static byte[] BuildHandshakeFinishFrame(
        bool useGcm,
        byte[] localKey,
        byte[] remoteNonce,
        byte[] gcmMessageIv
    )
    {
        var rkeyHmac = HMACSHA256.HashData(localKey, remoteNonce);
        return useGcm
            ? PackGcmFrame(
                CmdSessKeyNegFinish,
                seqno: 2,
                localKey,
                rkeyHmac,
                gcmMessageIv,
                retcode: null
            )
            : PackHmacFrame(
                CmdSessKeyNegFinish,
                seqno: 2,
                localKey,
                Aes_EncryptEcb(localKey, rkeyHmac)
            );
    }

    public static byte[] BuildCommandFrame(
        bool useGcm,
        byte[] sessionKey,
        int commandCode,
        byte[] plaintextPayload,
        uint seqno,
        byte[] gcmMessageIv
    )
    {
        // CONTROL/CONTROL_NEW levam o cabeçalho de versão "3.x\0..."(15 bytes) antes
        // do JSON; DP_QUERY(_NEW) e os comandos de negociação de sessão não levam
        // (NO_PROTOCOL_HEADER_CMDS) — confirmado por captura real de tráfego.
        var payload = commandCode is CmdControl or CmdControlNew
            ? Concat(useGcm ? VersionHeader35 : VersionHeader34, plaintextPayload)
            : plaintextPayload;

        return useGcm
            ? PackGcmFrame(commandCode, seqno, sessionKey, payload, gcmMessageIv, retcode: null)
            : PackHmacFrame(commandCode, seqno, sessionKey, Aes_EncryptEcb(sessionKey, payload));
    }

    private static readonly byte[] VersionHeader34 = Concat("3.4"u8.ToArray(), new byte[12]);
    private static readonly byte[] VersionHeader35 = Concat("3.5"u8.ToArray(), new byte[12]);

    private static byte[] PackHmacFrame(int cmd, uint seqno, byte[] hmacKey, byte[] ciphertext)
    {
        var length = (uint)(ciphertext.Length + 32 + 4); // hmac(32) + suffix(4)
        var header = new byte[16];
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(0), Prefix55Aa);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(4), seqno);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(8), (uint)cmd);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(12), length);

        var dataNoEnd = Concat(header, ciphertext);
        var mac = HMACSHA256.HashData(hmacKey, dataNoEnd);

        var suffix = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(suffix, Suffix55Aa);

        return Concat(dataNoEnd, mac, suffix);
    }

    private static byte[] PackGcmFrame(
        int cmd,
        uint seqno,
        byte[] gcmKey,
        byte[] plaintext,
        byte[] iv,
        int? retcode
    )
    {
        var raw = retcode is int r ? Concat(IntBE(r), plaintext) : plaintext;

        var header = new byte[18];
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(0), Prefix6699);
        BinaryPrimitives.WriteUInt16BigEndian(header.AsSpan(4), 0);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(6), seqno);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(10), (uint)cmd);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(14), (uint)(raw.Length + 28));

        var aad = header.AsSpan(4); // exclui o prefixo — 14 bytes (unknown+seqno+cmd+length)

        var ciphertext = new byte[raw.Length];
        var tag = new byte[16];
        using (var gcm = new AesGcm(gcmKey, tag.Length))
        {
            gcm.Encrypt(iv, raw, ciphertext, tag, aad);
        }

        return Concat(header, iv, ciphertext, tag, Suffix6699);
    }

    // ---- Decodificação de respostas (puro) ----

    public static (byte[] RemoteNonce, byte[] Hmac) ProcessHandshakeResponse(
        bool useGcm,
        byte[] localKey,
        byte[] localNonce,
        byte[] responseFrame
    )
    {
        var plain = useGcm
            ? UnpackGcmFrame(responseFrame, localKey, stripRetcode: true)
            : Aes_DecryptEcb(
                localKey,
                UnpackHmacFrame(responseFrame, localKey, stripRetcode: true)
            );

        var remoteNonce = plain[..16];
        var hmac = plain[16..48];

        var expectedHmac = HMACSHA256.HashData(localKey, localNonce);
        if (!expectedHmac.AsSpan().SequenceEqual(hmac))
        {
            throw new CryptographicException(
                "HMAC da resposta de negociação de sessão Tuya não validou."
            );
        }

        return (remoteNonce, hmac);
    }

    public static byte[] DeriveSessionKey(
        bool useGcm,
        byte[] localKey,
        byte[] localNonce,
        byte[] remoteNonce
    )
    {
        var xored = new byte[16];
        for (var i = 0; i < 16; i++)
        {
            xored[i] = (byte)(localNonce[i] ^ remoteNonce[i]);
        }

        if (!useGcm)
        {
            return Aes_EncryptEcb(localKey, xored, pad: false);
        }

        var iv = localNonce[..12];
        var ciphertext = new byte[16];
        var tag = new byte[16];
        using var gcm = new AesGcm(localKey, tag.Length);
        gcm.Encrypt(iv, xored, ciphertext, tag);
        return Concat(iv, ciphertext, tag)[12..28];
    }

    private static IReadOnlyDictionary<int, object?> ParseCommandResponse(
        bool useGcm,
        byte[] sessionKey,
        byte[] responseFrame
    )
    {
        var plain = useGcm
            ? UnpackGcmFrame(responseFrame, sessionKey, stripRetcode: true)
            : Aes_DecryptEcb(
                sessionKey,
                UnpackHmacFrame(responseFrame, sessionKey, stripRetcode: true)
            );

        // Respostas a CONTROL/CONTROL_NEW vêm com o mesmo cabeçalho de versão
        // "3.x\0..."(15 bytes, conteúdo do preenchimento não é necessariamente
        // zero — confirmado por captura real) prefixado antes do JSON. DP_QUERY(_NEW)
        // não tem esse prefixo — daí o startswith condicional, não um skip fixo.
        var payloadStart = 0;
        if (plain.Length >= 15 && (StartsWithAscii(plain, "3.4") || StartsWithAscii(plain, "3.5")))
        {
            payloadStart = 15;
        }

        var json = System
            .Text.Encoding.UTF8.GetString(plain, payloadStart, plain.Length - payloadStart)
            .TrimEnd('\0');
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        // CONTROL_NEW aninha em "data.dps" (payload "protocol 5"); DP_QUERY(_NEW)
        // devolve "dps" na raiz — confirmado por captura real dos dois formatos.
        var dpsElement =
            root.TryGetProperty("dps", out var dps) ? dps
            : root.TryGetProperty("data", out var data)
            && data.TryGetProperty("dps", out var nestedDps)
                ? nestedDps
            : root;

        var result = new Dictionary<int, object?>();
        foreach (var property in dpsElement.EnumerateObject())
        {
            if (!int.TryParse(property.Name, out var dp))
            {
                continue;
            }

            result[dp] = property.Value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Number => property.Value.GetDouble(),
                JsonValueKind.String => property.Value.GetString(),
                _ => null,
            };
        }

        return result;
    }

    private static byte[] UnpackHmacFrame(byte[] frame, byte[] hmacKey, bool stripRetcode)
    {
        // header(16) + retcode(4, claro) + ciphertext + hmac(32) + suffix(4)
        const int headerLen = 16;
        var retcodeLen = stripRetcode ? 4 : 0;
        var ciphertext = frame[(headerLen + retcodeLen)..^36];
        return ciphertext;
    }

    private static byte[] UnpackGcmFrame(byte[] frame, byte[] key, bool stripRetcode)
    {
        // header(18) + iv(12) + ciphertext + tag(16) + suffix(4)
        const int headerLen = 18;
        var iv = frame[headerLen..(headerLen + 12)];
        var ciphertext = frame[(headerLen + 12)..^(16 + 4)];
        var tag = frame[^(16 + 4)..^4];
        var aad = frame.AsSpan(4, headerLen - 4);

        var plain = new byte[ciphertext.Length];
        using (var gcm = new AesGcm(key, tag.Length))
        {
            gcm.Decrypt(iv, ciphertext, tag, plain, aad);
        }

        return stripRetcode ? plain[4..] : plain;
    }

    private static byte[] Aes_EncryptEcb(byte[] key, byte[] plaintext, bool pad = true)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.Mode = CipherMode.ECB;
        aes.Padding = pad ? PaddingMode.PKCS7 : PaddingMode.None;
        using var encryptor = aes.CreateEncryptor();
        return encryptor.TransformFinalBlock(plaintext, 0, plaintext.Length);
    }

    private static byte[] Aes_DecryptEcb(byte[] key, byte[] ciphertext)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.Mode = CipherMode.ECB;
        aes.Padding = PaddingMode.PKCS7;
        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(ciphertext, 0, ciphertext.Length);
    }

    private static bool StartsWithAscii(byte[] data, string ascii)
    {
        var bytes = System.Text.Encoding.ASCII.GetBytes(ascii);
        return data.AsSpan(0, bytes.Length).SequenceEqual(bytes);
    }

    private static byte[] IntBE(int value)
    {
        var bytes = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(bytes, value);
        return bytes;
    }

    private static byte[] Concat(params byte[][] parts)
    {
        var result = new byte[parts.Sum(p => p.Length)];
        var offset = 0;
        foreach (var part in parts)
        {
            Buffer.BlockCopy(part, 0, result, offset, part.Length);
            offset += part.Length;
        }
        return result;
    }
}
