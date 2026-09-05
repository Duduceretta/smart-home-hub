using System.Buffers.Binary;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

using System.Collections.Concurrent;

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
public sealed class TuyaSessionProtocolClient : ITuyaProtocolClient, IDisposable, IAsyncDisposable
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

    private static readonly TimeSpan DefaultSessionTtl = TimeSpan.FromSeconds(60);

    private readonly bool _useGcm; // false = v3.4, true = v3.5
    private readonly ILogger<TuyaSessionProtocolClient> _logger;
    private readonly TimeSpan _sessionTtl;

    // Seams de teste: nonces fixos opcionais (produção usa RandomNumberGenerator).
    private readonly byte[]? _fixedLocalNonce;
    private readonly byte[]? _fixedGcmMessageIv;
    private readonly Func<string, int, CancellationToken, Task<(TcpClient? Client, Stream Stream)>>? _streamFactoryForTests;

    // Cache de sessões TCP autenticadas persistentes por TuyaDeviceId.
    // A concorrência para o mesmo TuyaDeviceId é serializada pelo SemaphoreSlim
    // já existente em TuyaLocalControlService._deviceLocks (sem duplicação de locks).
    private readonly ConcurrentDictionary<string, TuyaSession> _sessions = new();

    public TuyaSessionProtocolClient(
        bool useGcm,
        ILogger<TuyaSessionProtocolClient> logger,
        byte[]? fixedLocalNonceForTests = null,
        byte[]? fixedGcmMessageIvForTests = null,
        TimeSpan? sessionTtlForTests = null,
        Func<string, int, CancellationToken, Task<(TcpClient? Client, Stream Stream)>>? streamFactoryForTests = null
    )
    {
        _useGcm = useGcm;
        _logger = logger;
        _fixedLocalNonce = fixedLocalNonceForTests;
        _fixedGcmMessageIv = fixedGcmMessageIvForTests;
        _sessionTtl = sessionTtlForTests ?? DefaultSessionTtl;
        _streamFactoryForTests = streamFactoryForTests;
    }

    public int ActiveSessionCount => _sessions.Count;

    public void PruneExpiredSessions()
    {
        var now = DateTime.UtcNow;
        foreach (var (deviceId, session) in _sessions)
        {
            if (now - session.LastActiveUtc > _sessionTtl)
            {
                if (_sessions.TryRemove(deviceId, out var expiredSession))
                {
                    try
                    {
                        expiredSession.Dispose();
                    }
                    catch
                    {
                        // ignore disposal errors
                    }
                }
            }
        }
    }

    public void ClearSessions()
    {
        foreach (var (deviceId, session) in _sessions)
        {
            if (_sessions.TryRemove(deviceId, out var s))
            {
                try
                {
                    s.Dispose();
                }
                catch
                {
                    // ignore
                }
            }
        }
    }

    public void Dispose()
    {
        ClearSessions();
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var (deviceId, session) in _sessions)
        {
            if (_sessions.TryRemove(deviceId, out var s))
            {
                try
                {
                    await s.DisposeAsync();
                }
                catch
                {
                    // ignore
                }
            }
        }
    }

    public async Task<IReadOnlyDictionary<int, object?>> QueryStatusAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        CancellationToken cancellationToken
    ) =>
        await ExecuteAsync(
            ipAddress,
            tuyaDeviceId,
            localKey,
            CmdDpQueryNew,
            "{}"u8.ToArray(),
            cancellationToken
        );

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
            tuyaDeviceId,
            localKey,
            CmdControlNew,
            System.Text.Encoding.UTF8.GetBytes(json),
            cancellationToken
        );
    }

    private async Task<IReadOnlyDictionary<int, object?>> ExecuteAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        int commandCode,
        byte[] commandPayload,
        CancellationToken cancellationToken
    )
    {
        PruneExpiredSessions();

        if (_sessions.TryGetValue(tuyaDeviceId, out var cachedSession))
        {
            var isExpired = DateTime.UtcNow - cachedSession.LastActiveUtc > _sessionTtl;
            var isEndpointChanged =
                cachedSession.IpAddress != ipAddress || cachedSession.LocalKey != localKey;

            if (isExpired || isEndpointChanged)
            {
                _sessions.TryRemove(tuyaDeviceId, out _);
                try
                {
                    await cachedSession.DisposeAsync();
                }
                catch
                {
                    // ignore disposal failure
                }
            }
            else
            {
                try
                {
                    var result = await SendCommandOnSessionAsync(
                        cachedSession,
                        commandCode,
                        commandPayload,
                        cancellationToken
                    );
                    cachedSession.LastActiveUtc = DateTime.UtcNow;
                    return result;
                }
                catch (CryptographicException ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Falha criptográfica na sessão TCP em cache para dispositivo Tuya {DeviceId} ({IpAddress}). Removendo sessão suspeita do cache.",
                        tuyaDeviceId,
                        ipAddress
                    );
                    _sessions.TryRemove(tuyaDeviceId, out _);
                    try
                    {
                        await cachedSession.DisposeAsync();
                    }
                    catch
                    {
                        // ignore disposal failure
                    }
                    throw;
                }
                catch (Exception ex) when (IsRecoverableSocketException(ex, cancellationToken))
                {
                    _logger.LogWarning(
                        ex,
                        "Sessão TCP em cache para dispositivo Tuya {DeviceId} ({IpAddress}) falhou. Reconectando transparentemente...",
                        tuyaDeviceId,
                        ipAddress
                    );
                    _sessions.TryRemove(tuyaDeviceId, out _);
                    try
                    {
                        await cachedSession.DisposeAsync();
                    }
                    catch
                    {
                        // ignore disposal failure
                    }
                }
            }
        }

        // Sem sessão em cache válida ou reconexão transparente necessária:
        // Abre conexão TCP, realiza handshake de 3 vias completo e envia comando.
        var freshSession = await CreateSessionAsync(
            ipAddress,
            tuyaDeviceId,
            localKey,
            cancellationToken
        );
        try
        {
            var result = await SendCommandOnSessionAsync(
                freshSession,
                commandCode,
                commandPayload,
                cancellationToken
            );
            freshSession.LastActiveUtc = DateTime.UtcNow;
            _sessions[tuyaDeviceId] = freshSession;
            return result;
        }
        catch
        {
            _sessions.TryRemove(tuyaDeviceId, out _);
            try
            {
                await freshSession.DisposeAsync();
            }
            catch
            {
                // ignore disposal failure
            }
            throw;
        }
    }

    private async Task<IReadOnlyDictionary<int, object?>> SendCommandOnSessionAsync(
        TuyaSession session,
        int commandCode,
        byte[] commandPayload,
        CancellationToken cancellationToken
    )
    {
        var gcmIv = _fixedGcmMessageIv;
        var seqno = session.NextSeqNo++;

        var commandFrame = BuildCommandFrame(
            _useGcm,
            session.SessionKey,
            commandCode,
            commandPayload,
            seqno,
            gcmIv ?? RandomNumberGenerator.GetBytes(12)
        );
        await SendAsync(session.Stream, commandFrame, cancellationToken);

        var commandRespFrame = await ReceiveFrameAsync(session.Stream, cancellationToken);
        return ParseCommandResponse(_useGcm, session.SessionKey, commandRespFrame);
    }

    private async Task<TuyaSession> CreateSessionAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        CancellationToken cancellationToken
    )
    {
        var (tcpClient, stream) = await OpenConnectionAsync(ipAddress, cancellationToken);
        try
        {
            var localKeyBytes = System.Text.Encoding.UTF8.GetBytes(localKey);
            var localNonce = _fixedLocalNonce ?? RandomNumberGenerator.GetBytes(16);
            var gcmIv = _fixedGcmMessageIv;

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

            return new TuyaSession
            {
                TcpClient = tcpClient,
                Stream = stream,
                SessionKey = sessionKey,
                IpAddress = ipAddress,
                LocalKey = localKey,
                LastActiveUtc = DateTime.UtcNow,
                NextSeqNo = 3,
            };
        }
        catch
        {
            try
            {
                stream.Dispose();
            }
            catch
            {
                // ignore
            }

            try
            {
                tcpClient?.Dispose();
            }
            catch
            {
                // ignore
            }
            throw;
        }
    }

    private async Task<(TcpClient? Client, Stream Stream)> OpenConnectionAsync(
        string ipAddress,
        CancellationToken cancellationToken
    )
    {
        if (_streamFactoryForTests is not null)
        {
            return await _streamFactoryForTests(ipAddress, Port, cancellationToken);
        }

        var tcpClient = new TcpClient();
        try
        {
            // Desliga o algoritmo de Nagle: o protocolo Tuya é request-response
            // síncrono com pacotes pequenos (handshake + comando, poucas dezenas
            // a centenas de bytes) — Nagle ligado atrasaria o envio esperando
            // acumular mais dados ou o ACK anterior, adicionando até ~40ms de
            // latência por escrita nesse padrão de tráfego, sem benefício.
            tcpClient.NoDelay = true;
            tcpClient.Client.SetSocketOption(
                SocketOptionLevel.Socket,
                SocketOptionName.KeepAlive,
                true
            );
            tcpClient.Client.SetSocketOption(
                SocketOptionLevel.Tcp,
                SocketOptionName.TcpKeepAliveTime,
                10
            );
            tcpClient.Client.SetSocketOption(
                SocketOptionLevel.Tcp,
                SocketOptionName.TcpKeepAliveInterval,
                2
            );
            using var connectCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            connectCts.CancelAfter(ConnectTimeoutMs);
            await tcpClient.ConnectAsync(ipAddress, Port, connectCts.Token);

            return (tcpClient, tcpClient.GetStream());
        }
        catch
        {
            tcpClient.Dispose();
            throw;
        }
    }

    private static bool IsRecoverableSocketException(
        Exception ex,
        CancellationToken cancellationToken
    )
    {
        if (cancellationToken.IsCancellationRequested)
        {
            return false;
        }

        return ex is IOException
            or SocketException
            or OperationCanceledException;
    }

    internal sealed class TuyaSession : IAsyncDisposable, IDisposable
    {
        public TcpClient? TcpClient { get; init; }
        public required Stream Stream { get; init; }
        public required byte[] SessionKey { get; init; }
        public required string IpAddress { get; set; }
        public required string LocalKey { get; set; }
        public DateTime LastActiveUtc { get; set; }
        public uint NextSeqNo { get; set; }

        public void Dispose()
        {
            try
            {
                Stream.Dispose();
            }
            catch
            {
            }

            try
            {
                TcpClient?.Dispose();
            }
            catch
            {
            }
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                await Stream.DisposeAsync();
            }
            catch
            {
            }

            try
            {
                TcpClient?.Dispose();
            }
            catch
            {
            }
        }
    }

    private async Task SendAsync(Stream stream, byte[] frame, CancellationToken ct)
    {
        _logger.LogDebug("SEND [{Length} bytes]: {Hex}", frame.Length, Convert.ToHexString(frame));
        await stream.WriteAsync(frame, ct);
        await stream.FlushAsync(ct);
    }

    // TCP não garante 1 Read() = 1 frame completo. Lê primeiro o prefixo (4
    // bytes) pra saber o formato de header (55AA/16 bytes vs 6699/18 bytes),
    // depois o resto do header pra achar o campo `length`, e só então lê
    // exatamente os bytes do corpo — em loop, acumulando, nunca assumindo que
    // um único Read() basta. Um `timeoutCts` só, criado uma vez fora do loop de
    // reassembly, garante que o timeout (ReceiveTimeoutMs) vale pra operação
    // inteira — um frame fragmentado em vários pedaços pequenos não pode
    // esticar a espera indefinidamente só porque cada pedaço individual
    // chegou dentro do prazo.
    //
    // Múltiplos frames grudados no mesmo Read() (2+ respostas numa única
    // leitura): não tratado de propósito, não por omissão — o protocolo aqui é
    // estritamente 1 request → 1 response, sempre aguardado antes do próximo
    // envio (ExecuteAsync nunca dispara dois comandos em paralelo no mesmo
    // socket). Como agora lemos exatamente `length` bytes do corpo (nunca "o
    // que vier"), mesmo que o SO entregasse bytes de mais numa única leitura de
    // baixo nível, o loop de ReadExactAsync abaixo já para no limite do frame
    // atual — o excedente (que não deveria existir dado o padrão de uso) fica
    // no buffer do socket pra próxima leitura, não é misturado no frame atual.
    private async Task<byte[]> ReceiveFrameAsync(Stream stream, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(ReceiveTimeoutMs);
        var timeoutToken = timeoutCts.Token;

        var prefixBuffer = new byte[4];
        await ReadExactAsync(stream, prefixBuffer, timeoutToken);
        var prefix = BinaryPrimitives.ReadUInt32BigEndian(prefixBuffer);

        byte[] frame;
        if (prefix == Prefix6699)
        {
            // Header 6699 tem 18 bytes no total; já lemos os 4 do prefixo.
            var headerRest = new byte[14];
            await ReadExactAsync(stream, headerRest, timeoutToken);
            // length (offset 14 do header completo = offset 10 daqui) cobre
            // iv(12) + ciphertext + tag(16); falta ainda o suffix(4) fixo.
            var lengthField = BinaryPrimitives.ReadUInt32BigEndian(headerRest.AsSpan(10, 4));
            var body = new byte[lengthField + 4];
            await ReadExactAsync(stream, body, timeoutToken);
            frame = Concat(prefixBuffer, headerRest, body);
        }
        else if (prefix == Prefix55Aa)
        {
            // Header 55AA tem 16 bytes no total; já lemos os 4 do prefixo.
            var headerRest = new byte[12];
            await ReadExactAsync(stream, headerRest, timeoutToken);
            // length (offset 12 do header completo = offset 8 daqui) já cobre
            // ciphertext + hmac(32) + suffix(4) inteiros — nada extra depois.
            var lengthField = BinaryPrimitives.ReadUInt32BigEndian(headerRest.AsSpan(8, 4));
            var body = new byte[lengthField];
            await ReadExactAsync(stream, body, timeoutToken);
            frame = Concat(prefixBuffer, headerRest, body);
        }
        else
        {
            throw new IOException(
                $"Prefixo de frame Tuya desconhecido: 0x{prefix:X8} — resposta corrompida ou fora de sincronia."
            );
        }

        _logger.LogDebug("RECV [{Length} bytes]: {Hex}", frame.Length, Convert.ToHexString(frame));
        return frame;
    }

    // Acumula em loop até preencher `buffer` inteiro — nunca assume que um
    // único ReadAsync entrega tudo de uma vez. `ct` já carrega o timeout
    // agregado da chamada inteira (não é resetado a cada pedaço parcial).
    private static async Task ReadExactAsync(Stream stream, byte[] buffer, CancellationToken ct)
    {
        var totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(totalRead), ct);
            if (read <= 0)
            {
                throw new IOException("Conexão Tuya encerrada antes de completar o frame.");
            }
            totalRead += read;
        }
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

    public static byte[] BuildHandshakeResponseFrame(
        bool useGcm,
        byte[] localKey,
        byte[] localNonce,
        byte[] remoteNonce,
        byte[]? gcmMessageIv = null
    )
    {
        var hmac = HMACSHA256.HashData(localKey, localNonce);
        var body = Concat(remoteNonce, hmac);
        var iv = gcmMessageIv ?? new byte[12];
        return useGcm
            ? PackGcmFrame(CmdSessKeyNegResp, seqno: 1, localKey, body, iv, retcode: 0)
            : PackHmacFrame(
                CmdSessKeyNegResp,
                seqno: 1,
                localKey,
                Concat(IntBE(0), Aes_EncryptEcb(localKey, body))
            );
    }

    public static byte[] BuildCommandResponseFrame(
        bool useGcm,
        byte[] sessionKey,
        int commandCode,
        string jsonPayload,
        uint seqno = 3,
        byte[]? gcmMessageIv = null,
        int retcode = 0
    )
    {
        var plaintextPayload = System.Text.Encoding.UTF8.GetBytes(jsonPayload);
        var iv = gcmMessageIv ?? new byte[12];
        return useGcm
            ? PackGcmFrame(commandCode, seqno, sessionKey, plaintextPayload, iv, retcode: retcode)
            : PackHmacFrame(
                commandCode,
                seqno,
                sessionKey,
                Concat(IntBE(retcode), Aes_EncryptEcb(sessionKey, plaintextPayload))
            );
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
