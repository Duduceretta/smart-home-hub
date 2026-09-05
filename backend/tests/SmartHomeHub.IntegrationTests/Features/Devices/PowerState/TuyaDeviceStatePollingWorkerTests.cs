using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.Infrastructure.BackgroundJobs;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.PowerState;

public class TuyaDeviceStatePollingWorkerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuyaLocalControlService =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();
    private readonly IRealtimeNotificationService _notificationService =
        factory.Services.GetRequiredService<IRealtimeNotificationService>();

    private TuyaDeviceStatePollingWorker CreateWorker() =>
        new(
            Factory.Services.GetRequiredService<IServiceScopeFactory>(),
            _tuyaLocalControlService,
            Factory.Services.GetRequiredService<ILogger<TuyaDeviceStatePollingWorker>>()
        );

    private void Reset()
    {
        _tuyaLocalControlService.ClearSubstitute();
        _notificationService.ClearReceivedCalls();
    }

    private static Result<TuyaPollingOutcome> Outcome(
        bool isOn,
        int? brightnessPercent = null,
        string? colorHex = null,
        int? colorTempPercent = null
    ) =>
        Result.Success(
            new TuyaPollingOutcome(isOn, brightnessPercent, colorHex, colorTempPercent, null, null)
        );

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Name = "Tuya Polling User",
            ExternalAuthUid = $"uid-{Guid.NewGuid()}",
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    private async Task<Device> SeedTuyaDeviceAsync(
        User user,
        string externalId,
        bool isOn,
        bool isOnline = true,
        DeviceType deviceType = DeviceType.Light,
        int? brightness = null,
        string? colorHex = null,
        int? colorTempPercent = null
    )
    {
        var device = new Device
        {
            UserId = user.Id,
            Name = $"Dispositivo {externalId}",
            Brand = "Tuya",
            ExternalId = externalId,
            Type = deviceType,
            IntegrationType = IntegrationType.TuyaLocal,
            Configuration = new TuyaDeviceConfiguration
            {
                IpAddress = "192.168.1.60",
                LocalKey = "local-key-123",
            },
            LiveState = new DeviceLiveState
            {
                IsOn = isOn,
                IsOnline = isOnline,
                Attributes = new DeviceLiveStateAttributes
                {
                    Brightness = brightness,
                    ColorHex = colorHex,
                    ColorTempPercent = colorTempPercent,
                },
            },
        };

        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return device;
    }

    [Fact]
    public async Task RunPollingCycle_WhenExternalChangeDetected_ShouldPersistAndNotifyOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        // Estado salvo é "desligado"; a consulta simula que o interruptor físico
        // ligou o dispositivo por fora — sem nenhum comando nosso.
        var device = await SeedTuyaDeviceAsync(user, "tuya-poll-changed", isOn: false);

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-changed"),
                Arg.Any<CancellationToken>()
            )
            .Returns(Outcome(isOn: true));

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.IsOn.Should().BeTrue();
        updated.LiveState.IsOnline.Should().BeTrue();

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                true,
                true,
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenOnlyBrightnessChangesExternally_ShouldPersistAndNotifyWithoutTouchingPower()
    {
        Reset();

        var user = await SeedUserAsync();
        // Power e demais atributos continuam iguais — só o brilho muda (ex: app
        // SmartLife ajustou o brilho sem mexer em liga/desliga/cor).
        var device = await SeedTuyaDeviceAsync(
            user,
            "tuya-poll-brightness-only",
            isOn: true,
            brightness: 40,
            colorTempPercent: 60
        );

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c =>
                    c.TuyaDeviceId == "tuya-poll-brightness-only"
                ),
                Arg.Any<CancellationToken>()
            )
            .Returns(Outcome(isOn: true, brightnessPercent: 85, colorTempPercent: 60));

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.IsOn.Should().BeTrue("power não mudou, não deve ser tocado");
        updated.LiveState.Attributes.Brightness.Should().Be(85);
        updated.LiveState.Attributes.ColorTempPercent.Should().Be(60);

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                true,
                true,
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenBrightnessAndColorChangeTogether_ShouldPersistBothAndNotifyOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        var device = await SeedTuyaDeviceAsync(
            user,
            "tuya-poll-multi-attr",
            isOn: true,
            brightness: 20,
            colorHex: "#FF0000"
        );

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-multi-attr"),
                Arg.Any<CancellationToken>()
            )
            .Returns(Outcome(isOn: true, brightnessPercent: 70, colorHex: "#00FF00"));

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.Attributes.Brightness.Should().Be(70);
        updated.LiveState.Attributes.ColorHex.Should().Be("#00FF00");

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                true,
                true,
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenStateUnchanged_ShouldNotPersistNorNotify()
    {
        Reset();

        var user = await SeedUserAsync();
        var device = await SeedTuyaDeviceAsync(
            user,
            "tuya-poll-unchanged",
            isOn: true,
            brightness: 50,
            colorHex: "#123456",
            colorTempPercent: 30
        );

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-unchanged"),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Outcome(
                    isOn: true,
                    brightnessPercent: 50,
                    colorHex: "#123456",
                    colorTempPercent: 30
                )
            );

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .DidNotReceive()
            .NotifyDeviceStatusChangedAsync(
                Arg.Any<string>(),
                device.Id,
                Arg.Any<bool>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_ForDeviceWithoutBrightnessOrColorSupport_ShouldIgnoreThoseAttributesSafely()
    {
        Reset();

        var user = await SeedUserAsync();
        // Categoria Switch (tomada simples) — não tem DpsBrightnessKey/DpsColorKey
        // configurados, então o driver real nunca resolveria esses DPs; aqui
        // simulamos exatamente esse retorno (tudo null) pra confirmar que o
        // worker não tenta comparar/gravar atributos que a categoria não tem.
        var device = await SeedTuyaDeviceAsync(
            user,
            "tuya-poll-switch",
            isOn: false,
            deviceType: DeviceType.Switch
        );

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-switch"),
                Arg.Any<CancellationToken>()
            )
            .Returns(Outcome(isOn: true));

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.IsOn.Should().BeTrue("o eixo de power continua funcionando normalmente");
        updated.LiveState.Attributes.Brightness.Should().BeNull();
        updated.LiveState.Attributes.ColorHex.Should().BeNull();
        updated.LiveState.Attributes.ColorTempPercent.Should().BeNull();

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                true,
                true,
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenDeviceBusyWithUserCommand_ShouldSkipWithoutMarkingOffline()
    {
        Reset();

        var user = await SeedUserAsync();
        var device = await SeedTuyaDeviceAsync(user, "tuya-poll-busy", isOn: true, isOnline: true);

        // Simula uma escrita de usuário em andamento no mesmo dispositivo — o
        // semáforo compartilhado já está ocupado, então o serviço real
        // devolveria Device.Busy pro caminho de polling (timeout curto).
        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-busy"),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Result.Failure<TuyaPollingOutcome>(
                    new Error("Device.Busy", "Dispositivo Tuya ocupado com outro comando.")
                )
            );

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated
            .LiveState!.IsOnline.Should()
            .BeTrue(
                "um dispositivo ocupado com um comando de usuário não pode ser marcado offline "
                    + "pelo polling — só foi pulado neste ciclo."
            );

        await _notificationService
            .DidNotReceive()
            .NotifyDeviceStatusChangedAsync(
                Arg.Any<string>(),
                device.Id,
                Arg.Any<bool>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenQueryFails_ShouldMarkOfflineViaSharedConnectivityUpdater()
    {
        Reset();

        var user = await SeedUserAsync();
        var device = await SeedTuyaDeviceAsync(user, "tuya-poll-offline", isOn: true);

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-offline"),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Result.Failure<TuyaPollingOutcome>(
                    new Error(
                        "Device.Offline",
                        "Não foi possível localizar o dispositivo Tuya na rede local."
                    )
                )
            );

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.IsOnline.Should().BeFalse();

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                Arg.Any<bool>(),
                Arg.Is(false),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WithMultipleDevices_ShouldQueryThemInParallel()
    {
        Reset();

        var user = await SeedUserAsync();
        var slowDeviceA = await SeedTuyaDeviceAsync(user, "tuya-poll-parallel-a", isOn: false);
        var slowDeviceB = await SeedTuyaDeviceAsync(user, "tuya-poll-parallel-b", isOn: false);

        // Mede concorrência real observada (pico de chamadas simultaneamente
        // "em voo") em vez de comparar tempo de parede — sob contenção de
        // recursos do ambiente de CI/sandbox, um limiar de wall-clock é frágil
        // mesmo quando as tarefas de fato rodam em paralelo. Duas chamadas
        // sobrepostas só são possíveis se Task.WhenAll as disparou ao mesmo
        // tempo (sequencial nunca chegaria a 2 simultâneas).
        var inFlight = 0;
        var maxObservedConcurrency = 0;
        var concurrencyLock = new object();

        async Task<Result<TuyaPollingOutcome>> DelayedSuccessAsync()
        {
            var current = Interlocked.Increment(ref inFlight);
            lock (concurrencyLock)
            {
                maxObservedConcurrency = Math.Max(maxObservedConcurrency, current);
            }

            await Task.Delay(300, TestContext.Current.CancellationToken);

            Interlocked.Decrement(ref inFlight);
            return Outcome(isOn: true);
        }

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-parallel-a"),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ => DelayedSuccessAsync());

        _tuyaLocalControlService
            .GetStateForPollingAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-poll-parallel-b"),
                Arg.Any<CancellationToken>()
            )
            .Returns(_ => DelayedSuccessAsync());

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        maxObservedConcurrency
            .Should()
            .BeGreaterThanOrEqualTo(
                2,
                "as duas consultas devem estar em voo ao mesmo tempo em algum momento — "
                    + "sequencial nunca produziria concorrência 2, não importa a velocidade."
            );

        var updatedA = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == slowDeviceA.Id, TestContext.Current.CancellationToken);
        var updatedB = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == slowDeviceB.Id, TestContext.Current.CancellationToken);

        updatedA.LiveState!.IsOn.Should().BeTrue();
        updatedB.LiveState!.IsOn.Should().BeTrue();
    }

    [Fact]
    public async Task RunPollingCycle_ShouldAlwaysCallPruneExpiredSessionsEvenWithoutCandidates()
    {
        Reset();

        // Nenhum dispositivo no banco (pollable = 0)
        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        // PruneExpiredSessions deve ter sido invocado incondicionalmente no início do ciclo
        _tuyaLocalControlService.Received(1).PruneExpiredSessions();
    }
}

