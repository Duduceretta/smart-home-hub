using System.Reflection;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

// Cobre o achado da auditoria: ReceiveFrameAsync assumia que 1 ReadAsync() = 1
// frame Tuya completo, sem ler o campo `length` do header nem fazer loop de
// reassembly. TCP não garante limite de mensagem por Read() — estes testes
// forçam a resposta a chegar fatiada em pedaços arbitrários (menores até que o
// tamanho de cada leitura pedida) pra provar que o frame é remontado certo
// antes de ser processado.
public class TuyaSessionProtocolClientFrameReassemblyTests
{
    // Stream fake determinístico: devolve, a cada ReadAsync, no máximo o que
    // sobrar do fragmento atual OU o que o chamador pediu (o que for menor) —
    // simula fidedignamente o comportamento real de um socket TCP fragmentado,
    // sem depender de rede/timing de verdade.
    private sealed class FragmentedStream(
        IEnumerable<byte[]> fragments,
        bool hangWhenExhausted = false
    ) : Stream
    {
        private readonly Queue<byte[]> _fragments = new(fragments);
        private byte[]? _current;
        private int _currentOffset;

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override void Flush() { }

        public override int Read(byte[] buffer, int offset, int count) =>
            throw new NotSupportedException("Só o caminho async é usado pelo driver.");

        public override long Seek(long offset, SeekOrigin origin) =>
            throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) =>
            throw new NotSupportedException("Testes de reassembly não escrevem no stream.");

        public override async ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default
        )
        {
            if (_current is null || _currentOffset >= _current.Length)
            {
                if (_fragments.Count == 0)
                {
                    if (hangWhenExhausted)
                    {
                        // Simula uma conexão que parou de mandar bytes no meio
                        // do frame — o timeout agregado do chamador deve
                        // resolver isso, não um Read() individual.
                        await Task.Delay(Timeout.Infinite, cancellationToken);
                    }
                    return 0;
                }

                _current = _fragments.Dequeue();
                _currentOffset = 0;
            }

            var available = _current.Length - _currentOffset;
            var toCopy = Math.Min(available, buffer.Length);
            _current.AsSpan(_currentOffset, toCopy).CopyTo(buffer.Span);
            _currentOffset += toCopy;
            return toCopy;
        }
    }

    private static async Task<byte[]> InvokeReceiveFrameAsync(
        TuyaSessionProtocolClient sut,
        Stream stream,
        CancellationToken ct
    )
    {
        var method = typeof(TuyaSessionProtocolClient).GetMethod(
            "ReceiveFrameAsync",
            BindingFlags.NonPublic | BindingFlags.Instance
        )!;
        return await (Task<byte[]>)method.Invoke(sut, [stream, ct])!;
    }

    // Fatia um frame completo em N pedaços de tamanho fixo pequeno — garante
    // que nenhum pedaço, por acidente, seja grande o bastante pra já conter um
    // Read() inteiro pedido pelo código de produção (o menor pedido real é de
    // 4 bytes, pro prefixo).
    private static List<byte[]> SplitIntoTinyFragments(byte[] whole, int fragmentSize) =>
        whole.Chunk(fragmentSize).Select(chunk => chunk.ToArray()).ToList();

    [Theory]
    [InlineData(false, 1)] // v3.4 (55AA/HMAC), 1 byte por fragmento — pior caso de fragmentação
    [InlineData(false, 3)] // v3.4, fragmentos de 3 bytes
    [InlineData(true, 1)] // v3.5 (6699/GCM), 1 byte por fragmento
    [InlineData(true, 5)] // v3.5, fragmentos de 5 bytes
    public async Task ReceiveFrameAsync_WhenResponseArrivesInManyPartialReads_ShouldReassembleExactFrame(
        bool useGcm,
        int fragmentSize
    )
    {
        // Arrange — usa o próprio builder de frame real (mesmo formato que o
        // dispositivo devolveria) como "resposta esperada", só pra ter bytes
        // válidos de um frame Tuya de verdade pra fatiar.
        var sessionKey = new byte[16];
        RandomNumberGenerator_Fill(sessionKey);
        var wholeFrame = TuyaSessionProtocolClient.BuildCommandFrame(
            useGcm,
            sessionKey,
            commandCode: 0x10,
            plaintextPayload: "{}"u8.ToArray(),
            seqno: 3,
            gcmMessageIv: new byte[12]
        );

        var fragments = SplitIntoTinyFragments(wholeFrame, fragmentSize);
        fragments
            .Should()
            .HaveCountGreaterThan(1, "o teste só prova algo se realmente fragmentar.");

        var stream = new FragmentedStream(fragments);
        var sut = new TuyaSessionProtocolClient(
            useGcm,
            Substitute.For<ILogger<TuyaSessionProtocolClient>>()
        );

        // Act
        var reassembled = await InvokeReceiveFrameAsync(sut, stream, CancellationToken.None);

        // Assert
        reassembled
            .Should()
            .Equal(
                wholeFrame,
                "o frame remontado deve ser byte-a-byte idêntico ao original, independente de quantos pedaços chegaram separados."
            );
    }

    [Fact]
    public async Task ReceiveFrameAsync_WhenStreamStopsMidFrame_ShouldRespectAggregateTimeoutNotHangForever()
    {
        // Arrange — entrega só os 4 bytes do prefixo e trava depois (simula
        // conexão que parou de responder no meio do frame). O timeout que
        // importa aqui é o agregado da operação inteira (ReceiveTimeoutMs),
        // não um timeout por Read() individual — cada Read() parcial que já
        // chegou "dentro do prazo" não deve resetar o relógio.
        var sessionKey = new byte[16];
        RandomNumberGenerator_Fill(sessionKey);
        var wholeFrame = TuyaSessionProtocolClient.BuildCommandFrame(
            useGcm: false,
            sessionKey,
            commandCode: 0x10,
            plaintextPayload: "{}"u8.ToArray(),
            seqno: 3,
            gcmMessageIv: new byte[12]
        );

        var stream = new FragmentedStream(
            [wholeFrame[..4]], // só o prefixo — nunca entrega o resto do header
            hangWhenExhausted: true
        );
        var sut = new TuyaSessionProtocolClient(
            useGcm: false,
            Substitute.For<ILogger<TuyaSessionProtocolClient>>()
        );

        // Act
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        Func<Task> act = () => InvokeReceiveFrameAsync(sut, stream, CancellationToken.None);

        // Assert — ReceiveTimeoutMs do driver é 2500ms; deve estourar perto
        // disso, não travar indefinidamente nem levar muito mais que isso.
        await act.Should().ThrowAsync<Exception>(); // OperationCanceledException, envolta pelo reflection TargetInvocationException
        stopwatch.Stop();
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(5));
    }

    private static void RandomNumberGenerator_Fill(byte[] buffer) =>
        System.Security.Cryptography.RandomNumberGenerator.Fill(buffer);
}
