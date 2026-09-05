using System.Collections.Concurrent;
using System.Reflection;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

public class TuyaLocalControlServiceTests
{
    private readonly ITuyaProtocolClient _protocolClient = Substitute.For<ITuyaProtocolClient>();
    private readonly ITuyaProtocolClientFactory _protocolClientFactory =
        Substitute.For<ITuyaProtocolClientFactory>();
    private readonly ITuyaUdpDiscoveryScanner _ipDiscoveryScanner =
        Substitute.For<ITuyaUdpDiscoveryScanner>();
    private readonly TuyaLocalControlService _sut;

    public TuyaLocalControlServiceTests()
    {
        _protocolClientFactory.Resolve(Arg.Any<string?>()).Returns(_protocolClient);

        _sut = new TuyaLocalControlService(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>()
        );
    }

    private static TuyaDeviceConnectionInfo Connection(string? dpsPowerKey = "20") =>
        new("tuya-device-abc", "local-key-123", "192.168.1.50", dpsPowerKey);

    [Fact]
    public async Task SetPowerStateAsync_ConfiguredDpMatchesBooleanStatus_ShouldUseConfiguredDp()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = false, [21] = 100 });

        _protocolClient
            .SetDpAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                20,
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection(),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ConfirmedIsOn.Should().BeTrue();
        result.Value.ResolvedDpsPowerKey.Should().BeNull();
        result.Value.ResolvedIpAddress.Should().BeNull();
    }

    [Fact]
    public async Task SetPowerStateAsync_ConfiguredDpAbsentFromStatus_ShouldFallBackToFirstBooleanDpAndReportResolution()
    {
        // Arrange — DpsPowerKey configurada como "1", mas o dispositivo real não expõe esse DP.
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [9] = "white", [20] = false });

        _protocolClient
            .SetDpAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                20,
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection("1"),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ConfirmedIsOn.Should().BeTrue();
        result.Value.ResolvedDpsPowerKey.Should().Be("20");
    }

    [Fact]
    public async Task SetPowerStateAsync_NoBooleanDpInStatus_ShouldReturnFailureWithoutSendingCommand()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [9] = "white", [22] = 500 });

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection(null),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Device.NoBooleanDp");
        await _protocolClient
            .DidNotReceive()
            .SetDpAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<int>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task SetPowerStateAsync_SetDpDoesNotEchoDp_ShouldTrustDesiredStateAsConfirmed()
    {
        // Arrange — ack vazio (allowEmptyResponse), sem eco do DP setado.
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = false });

        _protocolClient
            .SetDpAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<int>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?>());

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection(),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ConfirmedIsOn.Should().BeTrue();
    }

    [Fact]
    public async Task SetPowerStateAsync_QueryThrowsSocketException_ShouldReturnDeviceOfflineWithoutRediscoveringWhenIpUnchanged()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns<IReadOnlyDictionary<int, object?>>(_ =>
                throw new System.Net.Sockets.SocketException()
            );

        _ipDiscoveryScanner.ScanAsync(Arg.Any<CancellationToken>()).Returns(EmptyDiscoveryStream());

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection(),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Device.Offline");
    }

    [Fact]
    public async Task SetPowerStateAsync_QueryThrowsIOException_ShouldReturnConnectionClosedNotGenericCommunicationError()
    {
        // Arrange — IOException é o que ReceiveFrameAsync/ReadExactAsync lançam
        // quando o dispositivo fecha a conexão TCP no meio da operação (ex:
        // tomada desligada fisicamente durante a leitura). Antes desta correção
        // caía no catch genérico e virava "Device.CommunicationError" — mesmo
        // texto de qualquer erro inesperado, sem diferenciar o diagnóstico.
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns<IReadOnlyDictionary<int, object?>>(_ =>
                throw new IOException("Conexão Tuya encerrada antes de completar o frame.")
            );

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection(),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsFailure.Should().BeTrue();
        result
            .Error.Code.Should()
            .Be(
                "Device.ConnectionClosed",
                "IOException deve virar um código específico, diferente do genérico Device.CommunicationError."
            );
    }

    [Fact]
    public async Task SetPowerStateAsync_QueryFailsThenRediscoversFreshIp_ShouldRetryAndSucceed()
    {
        // Arrange — IP configurado (192.168.1.50) falha; broadcast revela IP novo (192.168.1.77).
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns<IReadOnlyDictionary<int, object?>>(_ =>
                throw new System.Net.Sockets.SocketException()
            );

        _protocolClient
            .QueryStatusAsync(
                "192.168.1.77",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = false });

        _protocolClient
            .SetDpAsync(
                "192.168.1.77",
                "tuya-device-abc",
                "local-key-123",
                20,
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        _ipDiscoveryScanner
            .ScanAsync(Arg.Any<CancellationToken>())
            .Returns(
                SingleDiscoveryStream(
                    new DiscoveredDeviceDto(
                        "temp-1",
                        "Lâmpada",
                        "Tuya",
                        "tuya-device-abc",
                        DeviceType.Switch,
                        IntegrationType.TuyaLocal,
                        "192.168.1.77",
                        null,
                        null,
                        null
                    )
                )
            );

        // Act
        var result = await _sut.SetPowerStateAsync(
            Connection(),
            desiredState: true,
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ConfirmedIsOn.Should().BeTrue();
        result.Value.ResolvedIpAddress.Should().Be("192.168.1.77");
    }

    [Fact]
    public async Task SetBrightnessAsync_ConfiguredDpMatchesNumericStatus_ShouldConvertPercentToDeviceScale()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true, [22] = 520.0 });

        _protocolClient
            .SetDpsAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Is<IReadOnlyDictionary<int, object>>(dps =>
                    dps.Count == 1 && (int)dps[22] == 505
                ),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [22] = 505.0 });

        // Act
        var result = await _sut.SetBrightnessAsync(
            Connection() with
            {
                DpsBrightnessKey = "22",
            },
            brightnessPercent: 50,
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ResolvedDpsBrightnessKey.Should().BeNull();
    }

    [Fact]
    public async Task SetBrightnessAsync_DeviceInColourMode_ShouldWriteVComponentOfColorDpNotWhiteBrightnessDp()
    {
        // Arrange — escrever DP22 (brilho branco) faz o hardware real trocar
        // sozinho pro modo branco (confirmado por diagnóstico manual), então
        // em modo "colour" o brilho tem que virar o V do HSV, sem tocar DP22.
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(
                new Dictionary<int, object?>
                {
                    [20] = true,
                    [21] = "colour",
                    [22] = 1000.0,
                    [24] = "000003e803e8",
                }
            );

        _protocolClient
            .SetDpsAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Is<IReadOnlyDictionary<int, object>>(dps =>
                    dps.Count == 1 && (string)dps[24] == "000003e800d0"
                ),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [24] = "000003e800d0" });

        // Act
        var result = await _sut.SetBrightnessAsync(
            Connection() with
            {
                DpsBrightnessKey = "22",
                DpsColorKey = "24",
            },
            brightnessPercent: 20,
            CancellationToken.None
        );

        // Assert — não deve ter chamado SetDpsAsync tocando DP22 nenhuma vez.
        result.IsSuccess.Should().BeTrue();
        await _protocolClient
            .DidNotReceive()
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Is<IReadOnlyDictionary<int, object>>(dps => dps.ContainsKey(22)),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task SetBrightnessAsync_ConfiguredDpNotNumeric_ShouldReturnFailureWithoutSendingCommand()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true, [21] = "white" });

        // Act
        var result = await _sut.SetBrightnessAsync(
            Connection() with
            {
                DpsBrightnessKey = "99",
            },
            brightnessPercent: 50,
            CancellationToken.None
        );

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Device.NoBrightnessDp");
    }

    [Fact]
    public async Task SetColorAsync_ConfiguredColorDpAndWorkModeDpPresent_ShouldSetBothDpsAndReportAutoDetection()
    {
        // Arrange — mesmo snapshot real capturado no diagnóstico manual.
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(
                new Dictionary<int, object?>
                {
                    [20] = true,
                    [21] = "white",
                    [22] = 520.0,
                    [24] = "00b403e803e8",
                }
            );

        _protocolClient
            .SetDpsAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Is<IReadOnlyDictionary<int, object>>(dps =>
                    dps.Count == 2
                    && (string)dps[24] == "000003e803e8"
                    && (string)dps[21] == "colour"
                ),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [24] = "000003e803e8", [21] = "colour" });

        // Act
        var result = await _sut.SetColorAsync(
            Connection() with
            {
                DpsColorKey = "24",
            },
            colorHex: "#FF0000",
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ResolvedDpsColorKey.Should().BeNull();
        result.Value.ResolvedSupportsColor.Should().BeTrue();
    }

    [Fact]
    public async Task SetColorAsync_NoColorLikeDpInStatus_ShouldReturnFailureWithoutSendingCommand()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true, [21] = "white" });

        // Act
        var result = await _sut.SetColorAsync(
            Connection() with
            {
                DpsColorKey = null,
            },
            "#00FF00",
            CancellationToken.None
        );

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Device.NoColorDp");
    }

    [Fact]
    public async Task SetColorTempAsync_ConfiguredDpNumeric_ShouldConvertPercentAndForceWhiteMode()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(
                new Dictionary<int, object?>
                {
                    [20] = true,
                    [21] = "colour",
                    [23] = 1000.0,
                }
            );

        _protocolClient
            .SetDpsAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Is<IReadOnlyDictionary<int, object>>(dps =>
                    dps.Count == 2 && (int)dps[23] == 830 && (string)dps[21] == "white"
                ),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [23] = 830.0, [21] = "white" });

        // Act
        var result = await _sut.SetColorTempAsync(
            Connection() with
            {
                DpsColorTempKey = "23",
            },
            colorTempPercent: 83,
            CancellationToken.None
        );

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ResolvedDpsColorTempKey.Should().BeNull();
    }

    [Fact]
    public async Task SetWorkModeAsync_WorkModeDpPresent_ShouldSendNewMode()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true, [21] = "white" });

        _protocolClient
            .SetDpsAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Is<IReadOnlyDictionary<int, object>>(dps =>
                    dps.Count == 1 && (string)dps[21] == "colour"
                ),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [21] = "colour" });

        // Act
        var result = await _sut.SetWorkModeAsync(Connection(), "colour", CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task GetWorkModeAsync_WorkModeDpPresent_ShouldReturnCurrentValue()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true, [21] = "colour" });

        // Act
        var result = await _sut.GetWorkModeAsync(Connection(), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("colour");
    }

    [Fact]
    public async Task GetWorkModeAsync_NoWorkModeDp_ShouldReturnNullWithoutFailure()
    {
        // Arrange
        _protocolClient
            .QueryStatusAsync(
                "192.168.1.50",
                "tuya-device-abc",
                "local-key-123",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        // Act
        var result = await _sut.GetWorkModeAsync(Connection(), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    // ---- Exclusão mútua por dispositivo (achado central da auditoria de drivers IoT) ----

    [Fact]
    public async Task ConcurrentOperations_OnSameDevice_ShouldCoalesceIntoSingleQueryDecideSetInsteadOfSerializing()
    {
        // Arrange — cenário concreto da auditoria: brilho e cor disparados quase
        // ao mesmo tempo no MESMO dispositivo, dentro da janela de coalescência.
        // Antes da coalescência isso gerava 2 ciclos completos serializados pelo
        // semáforo (sem race, mas 2 handshakes TCP); agora deve virar 1 ciclo só,
        // com os dois DPs mesclados no mesmo SetDpsAsync — sem race porque os
        // dois efeitos são resolvidos contra o MESMO status antes de escrever.
        var queryCallCount = 0;

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

        IReadOnlyDictionary<int, object>? capturedDps = null;
        _protocolClient
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Do<IReadOnlyDictionary<int, object>>(dps => capturedDps = dps),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [22] = 505.0, [24] = "000003e800d0" });

        // Act
        var brightnessTask = _sut.SetBrightnessAsync(
            Connection() with
            {
                DpsBrightnessKey = "22",
            },
            brightnessPercent: 50,
            CancellationToken.None
        );
        var colorTask = _sut.SetColorAsync(
            Connection() with
            {
                DpsColorKey = "24",
            },
            colorHex: "#FF0000",
            CancellationToken.None
        );

        await Task.WhenAll(brightnessTask, colorTask);
        var brightnessResult = await brightnessTask;
        var colorResult = await colorTask;

        // Assert
        brightnessResult.IsSuccess.Should().BeTrue();
        colorResult.IsSuccess.Should().BeTrue();

        queryCallCount
            .Should()
            .Be(
                1,
                "brilho e cor na mesma janela de coalescência devem compartilhar 1 único QueryStatusAsync, não 1 por comando."
            );

        await _protocolClient
            .Received(1)
            .SetDpsAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<IReadOnlyDictionary<int, object>>(),
                Arg.Any<CancellationToken>()
            );

        capturedDps.Should().NotBeNull();
        capturedDps!
            .Should()
            .ContainKey(22, "o DP de brilho deve estar no payload combinado")
            .WhoseValue.Should()
            .Be(505);
        capturedDps.Should().ContainKey(24, "o DP de cor deve estar no mesmo payload combinado");
    }

    [Fact]
    public async Task ConcurrentOperations_OnDifferentDevices_ShouldRunInParallelWithoutBlockingEachOther()
    {
        // Arrange — dispositivos diferentes (IPs/sockets diferentes) não devem
        // competir pelo mesmo semáforo.
        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = false });

        _protocolClient
            .SetDpAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<int>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ => DelayedPowerSetAsync());

        static async Task<IReadOnlyDictionary<int, object?>> DelayedPowerSetAsync()
        {
            await Task.Delay(300);
            return new Dictionary<int, object?> { [20] = true };
        }

        var connectionA = Connection();
        var connectionB = new TuyaDeviceConnectionInfo(
            "tuya-device-xyz",
            "local-key-456",
            "192.168.1.51",
            "20"
        );

        // Act
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var taskA = _sut.SetPowerStateAsync(connectionA, true, CancellationToken.None);
        var taskB = _sut.SetPowerStateAsync(connectionB, true, CancellationToken.None);
        await Task.WhenAll(taskA, taskB);
        stopwatch.Stop();

        // Assert — se estivessem serializadas por engano, o total seria ~600ms (soma).
        // Em paralelo de verdade, fica perto de uma única operação (~300ms).
        stopwatch
            .ElapsedMilliseconds.Should()
            .BeLessThan(
                550,
                "dispositivos diferentes não devem bloquear um ao outro — o tempo total deve "
                    + "ficar perto de uma operação isolada (300ms), não da soma das duas (600ms)."
            );
    }

    [Fact]
    public async Task Exception_DuringOperation_ShouldReleaseSemaphore_AllowingNextOperationOnSameDeviceToProceed()
    {
        // Arrange — força uma exceção não tratada dentro da operação (antes de
        // qualquer I/O real, direto na resolução do protocol client) pra provar
        // que o finally libera o semáforo mesmo assim.
        var callCount = 0;
        _protocolClientFactory
            .Resolve(Arg.Any<string?>())
            .Returns(_ =>
            {
                callCount++;
                if (callCount == 1)
                {
                    throw new InvalidOperationException("Falha simulada dentro da operação.");
                }
                return _protocolClient;
            });

        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = false });

        _protocolClient
            .SetDpAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<int>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        // Act
        Func<Task> firstCall = () =>
            _sut.SetPowerStateAsync(Connection(), true, CancellationToken.None);
        await firstCall.Should().ThrowAsync<InvalidOperationException>();

        var secondResult = await _sut.SetPowerStateAsync(
            Connection(),
            true,
            CancellationToken.None
        );

        // Assert
        secondResult
            .IsSuccess.Should()
            .BeTrue(
                "o semáforo deve ser liberado no finally mesmo após uma exceção não tratada — "
                    + "senão a próxima operação no mesmo dispositivo travaria para sempre."
            );
    }

    [Fact]
    public async Task SemaphoreAcquireTimeout_WhenAnotherOperationHoldsTheLockTooLong_ShouldReturnDeviceBusy()
    {
        // Arrange — timeout de aquisição bem curto pro teste não esperar 10s de verdade.
        var sut = new TuyaLocalControlService(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>(),
            semaphoreAcquireTimeoutForTests: TimeSpan.FromMilliseconds(100)
        );

        _protocolClient
            .QueryStatusAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ => DelayedQueryAsync());

        static async Task<IReadOnlyDictionary<int, object?>> DelayedQueryAsync()
        {
            // Segura o lock bem além do timeout de aquisição configurado.
            await Task.Delay(500);
            return new Dictionary<int, object?> { [20] = false };
        }

        _protocolClient
            .SetDpAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<int>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        // Act
        var firstTask = sut.SetPowerStateAsync(Connection(), true, CancellationToken.None);
        await Task.Delay(20); // garante que a primeira já pegou o lock
        var secondResult = await sut.SetPowerStateAsync(Connection(), true, CancellationToken.None);
        await firstTask;

        // Assert
        secondResult.IsFailure.Should().BeTrue();
        secondResult
            .Error.Code.Should()
            .Be(
                "Device.Busy",
                "timeout de aquisição do semáforo deve retornar erro diferenciado de "
                    + "'dispositivo não respondeu' (Device.Offline/CommunicationError)."
            );
    }

    [Fact]
    public async Task TryResolveIpAsync_ResolutionFailsTwiceWithinWindow_ShouldOnlyBroadcastOnce()
    {
        // Arrange — device sem IP cacheado, broadcast nunca encontra o dispositivo.
        var sut = new TuyaLocalControlService(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>(),
            ipResolutionCircuitBreakerWindowForTests: TimeSpan.FromSeconds(10)
        );

        _ipDiscoveryScanner.ScanAsync(Arg.Any<CancellationToken>()).Returns(EmptyDiscoveryStream());

        var connection = new TuyaDeviceConnectionInfo(
            "tuya-device-abc",
            "local-key-123",
            IpAddress: null,
            "20"
        );

        // Act
        var firstResult = await sut.SetPowerStateAsync(connection, true, CancellationToken.None);
        var secondResult = await sut.SetPowerStateAsync(connection, true, CancellationToken.None);

        // Assert
        firstResult.IsFailure.Should().BeTrue();
        firstResult.Error.Code.Should().Be("Device.Offline");
        secondResult.IsFailure.Should().BeTrue();
        secondResult
            .Error.Code.Should()
            .Be(
                "Device.Offline",
                "circuit breaker deve continuar falhando rápido pro mesmo device dentro da janela."
            );

        // Segunda tentativa dentro da janela não deve repetir o broadcast UDP redundante.
        _ipDiscoveryScanner.Received(1).ScanAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task TryResolveIpAsync_AfterWindowExpires_ShouldBroadcastAgain()
    {
        // Arrange — janela bem curta pra não deixar o teste esperando de verdade.
        var sut = new TuyaLocalControlService(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>(),
            ipResolutionCircuitBreakerWindowForTests: TimeSpan.FromMilliseconds(50)
        );

        _ipDiscoveryScanner.ScanAsync(Arg.Any<CancellationToken>()).Returns(EmptyDiscoveryStream());

        var connection = new TuyaDeviceConnectionInfo(
            "tuya-device-abc",
            "local-key-123",
            IpAddress: null,
            "20"
        );

        // Act
        await sut.SetPowerStateAsync(connection, true, CancellationToken.None);
        await Task.Delay(TimeSpan.FromMilliseconds(150));
        await sut.SetPowerStateAsync(connection, true, CancellationToken.None);

        // Assert
        // Após a janela expirar, a próxima falha deve voltar a tentar o broadcast UDP normalmente.
        _ipDiscoveryScanner.Received(2).ScanAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task TryResolveIpAsync_SuccessfulResolution_ShouldClearCircuitBreakerImmediately()
    {
        // Arrange — semeia via reflection um breaker cuja janela JÁ EXPIROU
        // (simula uma falha anterior cujos 10s já passaram), chamando
        // TryResolveIpAsync diretamente. A implementação só teria motivo pra
        // deixar essa entrada obsoleta no dicionário se não removesse
        // explicitamente no sucesso — este teste garante que a remoção é
        // ativa (TryRemove no código), não incidental.
        var sut = new TuyaLocalControlService(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>(),
            ipResolutionCircuitBreakerWindowForTests: TimeSpan.FromSeconds(10)
        );

        const string tuyaDeviceId = "tuya-device-abc";

        var breakerField = typeof(TuyaLocalControlService).GetField(
            "_ipResolutionCircuitBreakerOpenUntil",
            BindingFlags.NonPublic | BindingFlags.Instance
        )!;
        var breakerDictionary = (ConcurrentDictionary<string, DateTime>)breakerField.GetValue(sut)!;
        breakerDictionary[tuyaDeviceId] = DateTime.UtcNow.AddMilliseconds(-1);

        _ipDiscoveryScanner
            .ScanAsync(Arg.Any<CancellationToken>())
            .Returns(
                SingleDiscoveryStream(
                    new DiscoveredDeviceDto(
                        "temp-1",
                        "Lâmpada",
                        "Tuya",
                        tuyaDeviceId,
                        DeviceType.Switch,
                        IntegrationType.TuyaLocal,
                        "192.168.1.77",
                        null,
                        null,
                        null
                    )
                )
            );

        var tryResolveIpAsync = typeof(TuyaLocalControlService).GetMethod(
            "TryResolveIpAsync",
            BindingFlags.NonPublic | BindingFlags.Instance
        )!;

        // Act
        var task =
            (Task<string?>)tryResolveIpAsync.Invoke(sut, [tuyaDeviceId, CancellationToken.None])!;
        var resolvedIp = await task;

        // Assert
        resolvedIp.Should().Be("192.168.1.77");
        breakerDictionary
            .ContainsKey(tuyaDeviceId)
            .Should()
            .BeFalse(
                "uma resolução bem-sucedida não pode deixar nenhuma entrada de breaker pra trás."
            );
    }

    [Fact]
    public async Task TryResolveIpAsync_CircuitBreakerOpenForOneDevice_ShouldNotAffectAnotherDevice()
    {
        // Arrange
        var sut = new TuyaLocalControlService(
            _protocolClientFactory,
            _ipDiscoveryScanner,
            Substitute.For<ILogger<TuyaLocalControlService>>(),
            ipResolutionCircuitBreakerWindowForTests: TimeSpan.FromSeconds(10)
        );

        var offlineDevice = new TuyaDeviceConnectionInfo(
            "tuya-device-offline",
            "local-key-123",
            IpAddress: null,
            "20"
        );
        var otherDevice = new TuyaDeviceConnectionInfo(
            "tuya-device-other",
            "local-key-456",
            IpAddress: null,
            "20"
        );

        _ipDiscoveryScanner
            .ScanAsync(Arg.Any<CancellationToken>())
            .Returns(
                _ => EmptyDiscoveryStream(),
                _ =>
                    SingleDiscoveryStream(
                        new DiscoveredDeviceDto(
                            "temp-2",
                            "Outra lâmpada",
                            "Tuya",
                            "tuya-device-other",
                            DeviceType.Switch,
                            IntegrationType.TuyaLocal,
                            "192.168.1.90",
                            null,
                            null,
                            null
                        )
                    )
            );

        _protocolClient
            .QueryStatusAsync(
                "192.168.1.90",
                "tuya-device-other",
                "local-key-456",
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = false });

        _protocolClient
            .SetDpAsync(
                "192.168.1.90",
                "tuya-device-other",
                "local-key-456",
                20,
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(new Dictionary<int, object?> { [20] = true });

        // Act — abre o breaker pro primeiro device.
        var offlineResult = await sut.SetPowerStateAsync(
            offlineDevice,
            true,
            CancellationToken.None
        );

        // Comando pra device DIFERENTE não deve ser afetado pelo breaker do primeiro.
        var otherResult = await sut.SetPowerStateAsync(otherDevice, true, CancellationToken.None);

        // Assert
        offlineResult.IsFailure.Should().BeTrue();
        otherResult
            .IsSuccess.Should()
            .BeTrue("breaker é por dispositivo — não pode bloquear comandos pra outro device.");
    }

    private static async IAsyncEnumerable<DiscoveredDeviceDto> EmptyDiscoveryStream()
    {
        await Task.CompletedTask;
        yield break;
    }

    private static async IAsyncEnumerable<DiscoveredDeviceDto> SingleDiscoveryStream(
        DiscoveredDeviceDto dto
    )
    {
        await Task.CompletedTask;
        yield return dto;
    }
}
