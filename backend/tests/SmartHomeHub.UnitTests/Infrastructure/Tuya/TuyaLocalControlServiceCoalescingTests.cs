using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

// Cobre a coalescência de comandos por dispositivo: o SemaphoreSlim (já
// implementado) resolve a corrida de dados, mas sozinho ainda serializa —
// uma rajada de N comandos pro mesmo device gerava N handshakes TCP completos
// sequenciais contra um microcontrolador que só aguenta 1-2 conexões
// concorrentes. Estes testes provam que comandos na mesma janela curta são
// fundidos num único ciclo de Query+Set antes de abrir a conexão.
public class TuyaLocalControlServiceCoalescingTests
{
    private readonly ITuyaProtocolClient _protocolClient = Substitute.For<ITuyaProtocolClient>();
    private readonly ITuyaProtocolClientFactory _protocolClientFactory =
        Substitute.For<ITuyaProtocolClientFactory>();
    private readonly ITuyaUdpDiscoveryScanner _ipDiscoveryScanner =
        Substitute.For<ITuyaUdpDiscoveryScanner>();

    public TuyaLocalControlServiceCoalescingTests()
    {
        _protocolClientFactory.Resolve(Arg.Any<string?>()).Returns(_protocolClient);
    }

    private static TuyaDeviceConnectionInfo Connection(
        string tuyaDeviceId = "tuya-device-abc",
        string ip = "192.168.1.50"
    ) => new(tuyaDeviceId, "local-key-123", ip, DpsPowerKey: "20");

    private TuyaLocalControlService CreateSut(TimeSpan coalescingWindow) =>
        new(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>(),
            coalescingWindowForTests: coalescingWindow
        );

    [Fact]
    public async Task RapidBrightnessBurst_OnSameDevice_ShouldCoalesceIntoOneCycle_WithLastValueWinning()
    {
        // Arrange — rajada de 10 comandos de brilho pro MESMO dispositivo,
        // disparados sem esperar um pelo outro (slider sendo arrastado rápido).
        var queryCallCount = 0;
        var setCallCount = 0;
        IReadOnlyDictionary<int, object>? capturedDps = null;

        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ =>
            {
                Interlocked.Increment(ref queryCallCount);
                return Task.FromResult<IReadOnlyDictionary<int, object?>>(
                    new Dictionary<int, object?>
                    {
                        [20] = true,
                        [21] = "white",
                        [22] = 100.0,
                    }
                );
            });

        _protocolClient
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Do<IReadOnlyDictionary<int, object>>(dps => capturedDps = dps),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ =>
            {
                Interlocked.Increment(ref setCallCount);
                return Task.FromResult<IReadOnlyDictionary<int, object?>>(
                    new Dictionary<int, object?>()
                );
            });

        var sut = CreateSut(TimeSpan.FromMilliseconds(150));
        var connection = Connection() with { DpsBrightnessKey = "22" };

        // Act — 10 chamadas em sequência rápida, sem aguardar entre elas.
        var tasks =
            new List<
                Task<SmartHomeHub.Domain.Common.Primitives.Result<TuyaBrightnessCommandOutcome>>
            >();
        for (var i = 1; i <= 10; i++)
        {
            tasks.Add(
                sut.SetBrightnessAsync(
                    connection,
                    brightnessPercent: i * 10,
                    CancellationToken.None
                )
            );
        }

        var results = await Task.WhenAll(tasks);

        // Assert
        results.Should().OnlyContain(r => r.IsSuccess);
        queryCallCount
            .Should()
            .Be(1, "os 10 comandos da rajada devem compartilhar 1 único QueryStatusAsync.");
        setCallCount
            .Should()
            .Be(
                1,
                "os 10 comandos da rajada devem gerar 1 único SetDpsAsync, não 10 handshakes TCP."
            );

        capturedDps.Should().NotBeNull();
        var lastRequestedPercent = 100; // i = 10 => 10 * 10
        var expectedDeviceValue = TuyaColorConverter.PercentToDeviceBrightness(
            lastRequestedPercent
        );
        capturedDps!
            .Should()
            .ContainKey(22)
            .WhoseValue.Should()
            .Be(
                expectedDeviceValue,
                "só o valor do ÚLTIMO comando da rajada deve ser enviado — os 9 intermediários são descartados (last-value-wins)."
            );
    }

    [Fact]
    public async Task MixedBrightnessAndColorCommands_OnSameDevice_ShouldMergeBothDpsIntoOnePayload()
    {
        // Arrange — comandos de tipos diferentes (brilho + cor) na mesma janela.
        var queryCallCount = 0;
        IReadOnlyDictionary<int, object>? capturedDps = null;

        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ =>
            {
                Interlocked.Increment(ref queryCallCount);
                return Task.FromResult<IReadOnlyDictionary<int, object?>>(
                    new Dictionary<int, object?>
                    {
                        [20] = true,
                        [21] = "white",
                        [22] = 520.0,
                        [24] = "00b403e803e8",
                    }
                );
            });

        _protocolClient
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Do<IReadOnlyDictionary<int, object>>(dps => capturedDps = dps),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Task.FromResult<IReadOnlyDictionary<int, object?>>(new Dictionary<int, object?>())
            );

        var sut = CreateSut(TimeSpan.FromMilliseconds(150));

        // Act
        var brightnessTask = sut.SetBrightnessAsync(
            Connection() with
            {
                DpsBrightnessKey = "22",
            },
            brightnessPercent: 40,
            CancellationToken.None
        );
        var colorTask = sut.SetColorAsync(
            Connection() with
            {
                DpsColorKey = "24",
            },
            colorHex: "#00FF00",
            CancellationToken.None
        );

        var brightnessResult = await brightnessTask;
        var colorResult = await colorTask;

        // Assert
        brightnessResult.IsSuccess.Should().BeTrue();
        colorResult.IsSuccess.Should().BeTrue();
        queryCallCount.Should().Be(1);

        capturedDps.Should().NotBeNull();
        capturedDps!.Should().ContainKey(22, "DP de brilho deve estar no payload mesclado");
        capturedDps.Should().ContainKey(24, "DP de cor deve estar no mesmo payload mesclado");
    }

    [Fact]
    public async Task CommandsForTwoDifferentDevices_ShouldNotBlockOrDelayEachOther()
    {
        // Arrange — dois dispositivos distintos, disparados ao mesmo tempo. A
        // coalescência de um não deve atrasar nem interferir no outro — mesma
        // garantia de paralelismo que o semáforo por dispositivo já dava.
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Task.FromResult<IReadOnlyDictionary<int, object?>>(
                    new Dictionary<int, object?>
                    {
                        [20] = true,
                        [21] = "white",
                        [22] = 100.0,
                    }
                )
            );

        _protocolClient
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<IReadOnlyDictionary<int, object>>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Task.FromResult<IReadOnlyDictionary<int, object?>>(new Dictionary<int, object?>())
            );

        var window = TimeSpan.FromMilliseconds(150);
        var sut = CreateSut(window);

        var connectionA = Connection(tuyaDeviceId: "device-a", ip: "192.168.1.50") with
        {
            DpsBrightnessKey = "22",
        };
        var connectionB = Connection(tuyaDeviceId: "device-b", ip: "192.168.1.51") with
        {
            DpsBrightnessKey = "22",
        };

        // Act
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var taskA = sut.SetBrightnessAsync(connectionA, 30, CancellationToken.None);
        var taskB = sut.SetBrightnessAsync(connectionB, 70, CancellationToken.None);
        var results = await Task.WhenAll(taskA, taskB);
        stopwatch.Stop();

        // Assert
        results.Should().OnlyContain(r => r.IsSuccess);
        stopwatch
            .Elapsed.Should()
            .BeLessThan(
                window + window, // margem folgada — não deve nem chegar perto de 2x a janela
                "dois dispositivos diferentes não devem competir pela mesma janela de coalescência — "
                    + "o total deve ficar perto de UMA janela, não da soma de duas."
            );
    }

    [Fact]
    public async Task SingleIsolatedCommand_ShouldCompleteWithinWindowPlusExecution_NotWorseThanNecessary()
    {
        // Arrange — comando isolado (sem rajada) não deve pagar nenhum custo
        // além da janela de coalescência + o tempo normal de execução.
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Task.FromResult<IReadOnlyDictionary<int, object?>>(
                    new Dictionary<int, object?>
                    {
                        [20] = true,
                        [21] = "white",
                        [22] = 100.0,
                    }
                )
            );

        _protocolClient
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<IReadOnlyDictionary<int, object>>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Task.FromResult<IReadOnlyDictionary<int, object?>>(new Dictionary<int, object?>())
            );

        var window = TimeSpan.FromMilliseconds(75);
        var sut = CreateSut(window);
        var connection = Connection() with { DpsBrightnessKey = "22" };

        // Act
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var result = await sut.SetBrightnessAsync(connection, 55, CancellationToken.None);
        stopwatch.Stop();

        // Assert — janela (75ms) + execução (mock, ~instantânea) + folga de
        // agendamento; bem abaixo do que seria "parecer travado" pro usuário.
        result.IsSuccess.Should().BeTrue();
        stopwatch
            .Elapsed.Should()
            .BeLessThan(
                window + TimeSpan.FromMilliseconds(200),
                "um comando isolado não deve demorar muito mais que a janela de coalescência em si."
            );
    }
}
