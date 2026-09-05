using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Commands.SetDeviceGroupPower;

public class SetDeviceGroupPowerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuyaLocalControlService =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();

    private record BulkPowerResponse(int SucceededCount, int FailedCount, int TotalCount);

    [Fact]
    public async Task TurnOn_ShouldTurnOnOnlyOnlineActuatorsThatAreOffInGroup()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luzes e Tomadas",
        };

        var offlineLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz Offline",
            Brand = "Philips",
            ExternalId = "GRP-BULK-1",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = false, IsOn = false },
        };

        var alreadyOnSwitch = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Tomada Ligada",
            Brand = "Sonoff",
            ExternalId = "GRP-BULK-2",
            Type = DeviceType.Switch,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        var offLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz Desligada",
            Brand = "Tuya",
            ExternalId = "GRP-BULK-3",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = false },
        };

        group.Devices.Add(offlineLight);
        group.Devices.Add(alreadyOnSwitch);
        group.Devices.Add(offLight);

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/device-groups/{group.Id}/devices/turn-on",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<BulkPowerResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!
            .TotalCount.Should()
            .Be(1, "apenas a luz online que estava desligada deve ser acionada");
    }

    [Fact]
    public async Task TurnOff_ShouldTurnOffOnlyOnlineActuatorsThatAreOnInGroup()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Todas as Luzes",
        };

        var onLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz Ligada",
            Brand = "Tuya",
            ExternalId = "GRP-OFF-1",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        group.Devices.Add(onLight);

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/device-groups/{group.Id}/devices/turn-off",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<BulkPowerResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task SetDeviceGroupPower_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Invasor",
            ExternalAuthUid = "firebase-token-123",
        };
        var victimUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vítima",
            ExternalAuthUid = "token-vitima",
        };
        var victimGroup = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = victimUser.Id,
            Name = "Grupo da Vítima",
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.DeviceGroups.Add(victimGroup);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/device-groups/{victimGroup.Id}/devices/turn-on",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task TurnOn_WithManyDevices_ShouldDispatchInParallelWithoutDbContextConflictAndIsolateFailures()
    {
        // Regressão: o fan-out roda em paralelo (Task.WhenAll), um IServiceScope/DbContext
        // isolado por dispositivo. Se a isolação de escopo estivesse quebrada, N dispositivos
        // concorrentes no mesmo DbContext estourariam "A second operation was started on this
        // context instance" e a requisição inteira retornaria 500 — o teste falharia no
        // StatusCode antes mesmo de olhar o corpo da resposta.
        _tuyaLocalControlService.ClearSubstitute();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Dono",
            ExternalAuthUid = "firebase-token-123",
        };
        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Muitas Luzes",
        };

        const int deviceCount = 8;
        const int failingDeviceIndex = 3;
        var devices = new List<Device>();

        for (var i = 0; i < deviceCount; i++)
        {
            var externalId = $"GRP-PARALLEL-{i}";
            devices.Add(
                new Device
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Name = $"Luz {i}",
                    Brand = "Tuya",
                    ExternalId = externalId,
                    Type = DeviceType.Light,
                    IntegrationType = IntegrationType.TuyaLocal,
                    Configuration = new TuyaDeviceConfiguration
                    {
                        IpAddress = $"192.168.1.{100 + i}",
                        LocalKey = $"local-key-{i}",
                    },
                    LiveState = new DeviceLiveState { IsOnline = true, IsOn = false },
                }
            );
        }

        foreach (var device in devices)
            group.Devices.Add(device);

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        for (var i = 0; i < deviceCount; i++)
        {
            var externalId = $"GRP-PARALLEL-{i}";

            if (i == failingDeviceIndex)
            {
                _tuyaLocalControlService
                    .SetPowerStateAsync(
                        Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == externalId),
                        true,
                        Arg.Any<CancellationToken>()
                    )
                    .Returns(
                        Result.Failure<TuyaCommandOutcome>(new Error("Device.Timeout", "Timeout"))
                    );
            }
            else
            {
                _tuyaLocalControlService
                    .SetPowerStateAsync(
                        Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == externalId),
                        true,
                        Arg.Any<CancellationToken>()
                    )
                    .Returns(Result.Success(new TuyaCommandOutcome(true, null, null)));
            }
        }

        var response = await Client.PostAsync(
            $"/api/device-groups/{group.Id}/devices/turn-on",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<BulkPowerResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.TotalCount.Should().Be(deviceCount);
        result
            .FailedCount.Should()
            .Be(1, "só o dispositivo com falha configurada deve contar como falho");
        result
            .SucceededCount.Should()
            .Be(
                deviceCount - 1,
                "a falha de 1 dispositivo isolado em seu próprio DbContext não deve afetar os demais"
            );
    }
}
