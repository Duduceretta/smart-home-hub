using System.Buffers.Binary;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

public class TuyaSessionProtocolClientSessionCacheTests
{
    private static readonly byte[] FakeLocalKey = Encoding.UTF8.GetBytes("0123456789abcdef");
    private static readonly byte[] FakeLocalNonce = Encoding.UTF8.GetBytes("localnonce123456");
    private static readonly byte[] FakeRemoteNonce = Encoding.UTF8.GetBytes("remotenonce12345");
    private static readonly byte[] FixedGcmIv = new byte[12];

    private sealed class SimulatedTuyaStream : Stream
    {
        private readonly bool _useGcm;
        private readonly byte[] _localKey;
        private readonly byte[] _localNonce;
        private readonly byte[] _remoteNonce;
        private readonly byte[] _sessionKey;
        private readonly MemoryStream _readBuffer = new();
        private int _readBufferPosition;

        public int HandshakeStartCount { get; private set; }
        public int HandshakeFinishCount { get; private set; }
        public int CommandCount { get; private set; }
        public bool DropOnNextRead { get; set; }
        public bool DropOnNextWrite { get; set; }
        public bool CorruptCommandResponse { get; set; }
        public bool IsDisposed { get; private set; }

        public SimulatedTuyaStream(
            bool useGcm,
            byte[] localKey,
            byte[] localNonce,
            byte[] remoteNonce,
            byte[] sessionKey
        )
        {
            _useGcm = useGcm;
            _localKey = localKey;
            _localNonce = localNonce;
            _remoteNonce = remoteNonce;
            _sessionKey = sessionKey;
        }

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => true;
        public override long Length => _readBuffer.Length;
        public override long Position
        {
            get => _readBufferPosition;
            set => throw new NotSupportedException();
        }

        public override void Flush() { }

        public override int Read(byte[] buffer, int offset, int count) =>
            throw new NotSupportedException("Apenas chamadas async são usadas pelo driver.");

        public override long Seek(long offset, SeekOrigin origin) =>
            throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) =>
            throw new NotSupportedException("Apenas chamadas async são usadas pelo driver.");

        public override ValueTask WriteAsync(
            ReadOnlyMemory<byte> buffer,
            CancellationToken cancellationToken = default
        )
        {
            if (DropOnNextWrite)
            {
                throw new IOException("Socket write failed: broken pipe");
            }

            var bytes = buffer.ToArray();
            if (bytes.Length < 18)
            {
                return ValueTask.CompletedTask;
            }

            var prefix = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(0, 4));
            uint cmd;
            if (prefix == 0x00006699) // 6699 (v3.5 GCM)
            {
                cmd = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(10, 4));
            }
            else if (prefix == 0x000055AA) // 55AA (v3.4 HMAC)
            {
                cmd = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(8, 4));
            }
            else
            {
                return ValueTask.CompletedTask;
            }

            if (cmd == 3) // CmdSessKeyNegStart
            {
                HandshakeStartCount++;
                var resp = TuyaSessionProtocolClient.BuildHandshakeResponseFrame(
                    _useGcm,
                    _localKey,
                    _localNonce,
                    _remoteNonce,
                    FixedGcmIv
                );
                EnqueueRead(resp);
            }
            else if (cmd == 5) // CmdSessKeyNegFinish
            {
                HandshakeFinishCount++;
            }
            else // Command (e.g. 0x10 CmdDpQueryNew ou 0x0D CmdControlNew)
            {
                CommandCount++;
                if (!DropOnNextRead)
                {
                    var resp = TuyaSessionProtocolClient.BuildCommandResponseFrame(
                        _useGcm,
                        _sessionKey,
                        (int)cmd,
                        "{\"dps\":{\"20\":true}}",
                        seqno: 3,
                        gcmMessageIv: FixedGcmIv
                    );
                    if (CorruptCommandResponse)
                    {
                        // Inverte byte para falhar tag GCM ou HMAC
                        resp[^10] ^= 0xFF;
                    }
                    EnqueueRead(resp);
                }
            }

            return ValueTask.CompletedTask;
        }

        public override ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default
        )
        {
            if (DropOnNextRead)
            {
                throw new IOException("Connection reset by peer");
            }

            var available = (int)(_readBuffer.Length - _readBufferPosition);
            if (available <= 0)
            {
                return ValueTask.FromResult(0);
            }

            var toCopy = Math.Min(available, buffer.Length);
            _readBuffer.GetBuffer().AsSpan(_readBufferPosition, toCopy).CopyTo(buffer.Span);
            _readBufferPosition += toCopy;
            return ValueTask.FromResult(toCopy);
        }

        private void EnqueueRead(byte[] bytes)
        {
            _readBuffer.SetLength(0);
            _readBuffer.Write(bytes, 0, bytes.Length);
            _readBufferPosition = 0;
        }

        protected override void Dispose(bool disposing)
        {
            IsDisposed = true;
            base.Dispose(disposing);
        }

        public override async ValueTask DisposeAsync()
        {
            IsDisposed = true;
            await base.DisposeAsync();
        }
    }

    private static (
        TuyaSessionProtocolClient Client,
        List<SimulatedTuyaStream> Streams,
        byte[] SessionKey
    ) CreateTestClient(
        bool useGcm = true,
        TimeSpan? sessionTtl = null
    )
    {
        var sessionKey = TuyaSessionProtocolClient.DeriveSessionKey(
            useGcm,
            FakeLocalKey,
            FakeLocalNonce,
            FakeRemoteNonce
        );
        var createdStreams = new List<SimulatedTuyaStream>();

        var client = new TuyaSessionProtocolClient(
            useGcm: useGcm,
            logger: Substitute.For<ILogger<TuyaSessionProtocolClient>>(),
            fixedLocalNonceForTests: FakeLocalNonce,
            fixedGcmMessageIvForTests: FixedGcmIv,
            sessionTtlForTests: sessionTtl,
            streamFactoryForTests: (ip, port, ct) =>
            {
                var s = new SimulatedTuyaStream(
                    useGcm,
                    FakeLocalKey,
                    FakeLocalNonce,
                    FakeRemoteNonce,
                    sessionKey
                );
                createdStreams.Add(s);
                return Task.FromResult<(TcpClient?, Stream)>((null, s));
            }
        );

        return (client, createdStreams, sessionKey);
    }

    [Theory]
    [InlineData(false)] // v3.4 (HMAC)
    [InlineData(true)] // v3.5 (GCM)
    public async Task TwoConsecutiveOperations_SameDevice_ShouldReuseSessionAndExecuteOnlyOneHandshake(
        bool useGcm
    )
    {
        var (client, streams, _) = CreateTestClient(useGcm);

        // Op 1: QueryStatus
        var result1 = await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        result1.Should().ContainKey(20);
        result1[20].Should().Be(true);
        streams.Should().HaveCount(1);
        streams[0].HandshakeStartCount.Should().Be(1);
        streams[0].HandshakeFinishCount.Should().Be(1);
        streams[0].CommandCount.Should().Be(1);
        client.ActiveSessionCount.Should().Be(1);

        // Op 2: SetDp on same device
        var result2 = await client.SetDpAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            20,
            true,
            CancellationToken.None
        );

        result2.Should().ContainKey(20);
        result2[20].Should().Be(true);
        // Nenhum stream novo aberto, nenhum handshake adicional realizado!
        streams.Should().HaveCount(1);
        streams[0].HandshakeStartCount.Should().Be(1);
        streams[0].HandshakeFinishCount.Should().Be(1);
        streams[0].CommandCount.Should().Be(2);
        client.ActiveSessionCount.Should().Be(1);
    }

    [Fact]
    public async Task SocketFailureOnCachedSession_ShouldTransparentlyReconnectAndSucceed()
    {
        var (client, streams, _) = CreateTestClient(useGcm: true);

        // Op 1: primeiro comando abre conexão e completa handshake
        var result1 = await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        result1[20].Should().Be(true);
        streams.Should().HaveCount(1);
        streams[0].HandshakeStartCount.Should().Be(1);
        streams[0].CommandCount.Should().Be(1);

        // Simula queda de socket no stream ativo (ex: RST enviado pelo dispositivo)
        streams[0].DropOnNextRead = true;

        // Op 2: a sessão em cache falha, é descartada e reconecta transparentemente
        var result2 = await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        result2[20].Should().Be(true);
        // Dois streams criados: o primeiro foi fechado, o segundo assumiu com handshake novo
        streams.Should().HaveCount(2);
        streams[0].IsDisposed.Should().BeTrue();
        streams[1].HandshakeStartCount.Should().Be(1);
        streams[1].CommandCount.Should().Be(1);
        client.ActiveSessionCount.Should().Be(1);
    }

    [Fact]
    public async Task DistinctDevices_ShouldMaintainIndependentSessionsWithoutCollision()
    {
        var (client, streams, _) = CreateTestClient(useGcm: true);

        // Op em device-1
        await client.QueryStatusAsync(
            "192.168.1.101",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        // Op em device-2
        await client.QueryStatusAsync(
            "192.168.1.102",
            "device-2",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        streams.Should().HaveCount(2);
        client.ActiveSessionCount.Should().Be(2);

        // Segunda op em device-1 reutiliza stream de device-1
        await client.SetDpAsync(
            "192.168.1.101",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            20,
            true,
            CancellationToken.None
        );

        // Segunda op em device-2 reutiliza stream de device-2
        await client.SetDpAsync(
            "192.168.1.102",
            "device-2",
            Encoding.UTF8.GetString(FakeLocalKey),
            20,
            true,
            CancellationToken.None
        );

        streams.Should().HaveCount(2);
        streams[0].HandshakeStartCount.Should().Be(1);
        streams[0].CommandCount.Should().Be(2);
        streams[1].HandshakeStartCount.Should().Be(1);
        streams[1].CommandCount.Should().Be(2);
    }

    [Fact]
    public async Task TtlExpiration_ShouldDropSessionAndPerformNewHandshake()
    {
        // TTL ultracurto de 50ms para teste
        var (client, streams, _) = CreateTestClient(
            useGcm: true,
            sessionTtl: TimeSpan.FromMilliseconds(50)
        );

        // Op 1
        await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );
        streams.Should().HaveCount(1);
        streams[0].HandshakeStartCount.Should().Be(1);

        // Espera expirar o TTL
        await Task.Delay(75, TestContext.Current.CancellationToken);

        // Op 2 após TTL: deve descartar sessão expirada e abrir nova
        await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        streams.Should().HaveCount(2);
        streams[0].IsDisposed.Should().BeTrue();
        streams[1].HandshakeStartCount.Should().Be(1);
        client.ActiveSessionCount.Should().Be(1);
    }

    [Fact]
    public async Task EndpointIpChanged_ShouldDropOldSessionAndOpenNewSessionToNewIp()
    {
        var (client, streams, _) = CreateTestClient(useGcm: true);

        // Op 1 com IP antigo
        await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );
        streams.Should().HaveCount(1);

        // Op 2 com novo IP (ex: DHCP reatribuiu endereço)
        await client.QueryStatusAsync(
            "192.168.1.199",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        streams.Should().HaveCount(2);
        streams[0].IsDisposed.Should().BeTrue();
        streams[1].HandshakeStartCount.Should().Be(1);
    }

    [Fact]
    public void FactoryResolve_ShouldReturnSameSessionClientForV34AndV35_AndLegacyClientForV31V33()
    {
        var loggerFactory = Substitute.For<ILoggerFactory>();
        loggerFactory
            .CreateLogger(Arg.Any<string>())
            .Returns(Substitute.For<ILogger>());

        var legacyClient = new TuyaNetProtocolClient();
        using var factory = new TuyaProtocolClientFactory(legacyClient, loggerFactory);

        // v3.5 retorna sempre a mesma instância com cache persistente
        var v35A = factory.Resolve("3.5");
        var v35B = factory.Resolve("3.5");
        v35A.Should().BeSameAs(v35B);
        v35A.Should().BeOfType<TuyaSessionProtocolClient>();

        // v3.4 retorna sempre a mesma instância com cache persistente
        var v34A = factory.Resolve("3.4");
        var v34B = factory.Resolve("3.4");
        v34A.Should().BeSameAs(v34B);
        v34A.Should().BeOfType<TuyaSessionProtocolClient>();
        v34A.Should().NotBeSameAs(v35A);

        // v3.1, v3.2, v3.3, null retornam o legacyClient efêmero por comando
        factory.Resolve("3.3").Should().BeSameAs(legacyClient);
        factory.Resolve("3.2").Should().BeSameAs(legacyClient);
        factory.Resolve("3.1").Should().BeSameAs(legacyClient);
        factory.Resolve(null).Should().BeSameAs(legacyClient);
    }

    [Fact]
    public async Task DisposeAsync_ShouldCloseAndDisposeAllCachedStreamsGracefully()
    {
        var (client, streams, _) = CreateTestClient(useGcm: true);

        await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        streams.Should().HaveCount(1);
        streams[0].IsDisposed.Should().BeFalse();
        client.ActiveSessionCount.Should().Be(1);

        // Dispara o descarte gracioso (simulando shutdown do container / host)
        await client.DisposeAsync();

        client.ActiveSessionCount.Should().Be(0);
        streams[0].IsDisposed.Should().BeTrue();
    }

    [Fact]
    public async Task CryptographicExceptionOnCachedSession_ShouldDropSessionFromCacheAndRethrow()
    {
        var (client, streams, _) = CreateTestClient(useGcm: true);

        // Op 1: bem-sucedida, sessão vai pro cache
        await client.QueryStatusAsync(
            "192.168.1.100",
            "device-1",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        client.ActiveSessionCount.Should().Be(1);
        streams.Should().HaveCount(1);

        // Simula resposta corrompida (tag GCM falha) no stream em cache
        streams[0].CorruptCommandResponse = true;

        // Op 2: deve lançar CryptographicException E remover a sessão do cache
        var act = () =>
            client.QueryStatusAsync(
                "192.168.1.100",
                "device-1",
                Encoding.UTF8.GetString(FakeLocalKey),
                CancellationToken.None
            );

        await act.Should().ThrowAsync<CryptographicException>();

        // Sessão suspeita foi expulsa do cache (ActiveSessionCount = 0)
        client.ActiveSessionCount.Should().Be(0);
        streams[0].IsDisposed.Should().BeTrue();
    }

    [Fact]
    public async Task PruneExpiredSessions_ShouldDropExpiredSessionWithoutRequiringFutureUsage()
    {
        // TTL ultracurto de 40ms
        var (client, streams, _) = CreateTestClient(
            useGcm: true,
            sessionTtl: TimeSpan.FromMilliseconds(40)
        );

        await client.QueryStatusAsync(
            "192.168.1.100",
            "device-abandoned",
            Encoding.UTF8.GetString(FakeLocalKey),
            CancellationToken.None
        );

        client.ActiveSessionCount.Should().Be(1);
        streams.Should().HaveCount(1);
        streams[0].IsDisposed.Should().BeFalse();

        // Espera expirar o TTL
        await Task.Delay(60, TestContext.Current.CancellationToken);

        // PruneExpiredSessions chamado diretamente (como o worker faz incondicionalmente a cada 12s)
        client.PruneExpiredSessions();

        // Sessão do device que nunca mais foi chamado é limpa sem esperar novo comando!
        client.ActiveSessionCount.Should().Be(0);
        streams[0].IsDisposed.Should().BeTrue();

        // Segunda chamada (idempotência): não gera erro
        client.PruneExpiredSessions();
        client.ActiveSessionCount.Should().Be(0);
    }
}

