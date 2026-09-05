using System.Buffers.Binary;
using System.Collections.Concurrent;
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
//
// Construção/parsing de frame (puro, sem I/O) foi extraído para TuyaFrameCodec
// (ver backend-audit-2026-09-05.md, seção 05) — extração mecânica, mesma
// lógica. Esta classe continua com o cache de sessão TCP, o ciclo de vida de
// conexão, envio/recebimento de frame e a reconexão transparente, intocados.
public sealed class TuyaSessionProtocolClient : ITuyaProtocolClient, IDisposable, IAsyncDisposable
{
    private const int Port = 6668;
    private const int ConnectTimeoutMs = 2500;
    private const int ReceiveTimeoutMs = 2500;

    private const int CmdDpQueryNew = 0x10; // 16 — comando REAL usado no wire, confirmado por captura real de tráfego.

    private static readonly TimeSpan DefaultSessionTtl = TimeSpan.FromSeconds(60);

    private readonly bool _useGcm; // false = v3.4, true = v3.5
    private readonly ILogger<TuyaSessionProtocolClient> _logger;
    private readonly TimeSpan _sessionTtl;

    // Seams de teste: nonces fixos opcionais (produção usa RandomNumberGenerator).
    private readonly byte[]? _fixedLocalNonce;
    private readonly byte[]? _fixedGcmMessageIv;
    private readonly Func<
        string,
        int,
        CancellationToken,
        Task<(TcpClient? Client, Stream Stream)>
    >? _streamFactoryForTests;

    // Cache de sessões TCP autenticadas persistentes por TuyaDeviceId.
    // A concorrência para o mesmo TuyaDeviceId é serializada pelo SemaphoreSlim
    // já existente em TuyaDeviceLockCoordinator (sem duplicação de locks).
    private readonly ConcurrentDictionary<string, TuyaSession> _sessions = new();

    public TuyaSessionProtocolClient(
        bool useGcm,
        ILogger<TuyaSessionProtocolClient> logger,
        byte[]? fixedLocalNonceForTests = null,
        byte[]? fixedGcmMessageIvForTests = null,
        TimeSpan? sessionTtlForTests = null,
        Func<
            string,
            int,
            CancellationToken,
            Task<(TcpClient? Client, Stream Stream)>
        >? streamFactoryForTests = null
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
            TuyaFrameCodec.CmdControlNew,
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

        var commandFrame = TuyaFrameCodec.BuildCommandFrame(
            _useGcm,
            session.SessionKey,
            commandCode,
            commandPayload,
            seqno,
            gcmIv ?? RandomNumberGenerator.GetBytes(12)
        );
        await SendAsync(session.Stream, commandFrame, cancellationToken);

        var commandRespFrame = await ReceiveFrameAsync(session.Stream, cancellationToken);
        return TuyaFrameCodec.ParseCommandResponse(_useGcm, session.SessionKey, commandRespFrame);
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

            var startFrame = TuyaFrameCodec.BuildHandshakeStartFrame(
                _useGcm,
                localKeyBytes,
                localNonce,
                gcmIv ?? RandomNumberGenerator.GetBytes(12)
            );
            await SendAsync(stream, startFrame, cancellationToken);

            var respFrame = await ReceiveFrameAsync(stream, cancellationToken);
            var (remoteNonce, _) = TuyaFrameCodec.ProcessHandshakeResponse(
                _useGcm,
                localKeyBytes,
                localNonce,
                respFrame
            );

            var finishFrame = TuyaFrameCodec.BuildHandshakeFinishFrame(
                _useGcm,
                localKeyBytes,
                remoteNonce,
                gcmIv ?? RandomNumberGenerator.GetBytes(12)
            );
            await SendAsync(stream, finishFrame, cancellationToken);

            var sessionKey = TuyaFrameCodec.DeriveSessionKey(
                _useGcm,
                localKeyBytes,
                localNonce,
                remoteNonce
            );

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
            using var connectCts = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken
            );
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

        return ex is IOException or SocketException or OperationCanceledException;
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
            catch { }

            try
            {
                TcpClient?.Dispose();
            }
            catch { }
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                await Stream.DisposeAsync();
            }
            catch { }

            try
            {
                TcpClient?.Dispose();
            }
            catch { }
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
        if (prefix == TuyaFrameCodec.Prefix6699)
        {
            // Header 6699 tem 18 bytes no total; já lemos os 4 do prefixo.
            var headerRest = new byte[14];
            await ReadExactAsync(stream, headerRest, timeoutToken);
            // length (offset 14 do header completo = offset 10 daqui) cobre
            // iv(12) + ciphertext + tag(16); falta ainda o suffix(4) fixo.
            var lengthField = BinaryPrimitives.ReadUInt32BigEndian(headerRest.AsSpan(10, 4));
            var body = new byte[lengthField + 4];
            await ReadExactAsync(stream, body, timeoutToken);
            frame = TuyaFrameCodec.Concat(prefixBuffer, headerRest, body);
        }
        else if (prefix == TuyaFrameCodec.Prefix55Aa)
        {
            // Header 55AA tem 16 bytes no total; já lemos os 4 do prefixo.
            var headerRest = new byte[12];
            await ReadExactAsync(stream, headerRest, timeoutToken);
            // length (offset 12 do header completo = offset 8 daqui) já cobre
            // ciphertext + hmac(32) + suffix(4) inteiros — nada extra depois.
            var lengthField = BinaryPrimitives.ReadUInt32BigEndian(headerRest.AsSpan(8, 4));
            var body = new byte[lengthField];
            await ReadExactAsync(stream, body, timeoutToken);
            frame = TuyaFrameCodec.Concat(prefixBuffer, headerRest, body);
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
}
