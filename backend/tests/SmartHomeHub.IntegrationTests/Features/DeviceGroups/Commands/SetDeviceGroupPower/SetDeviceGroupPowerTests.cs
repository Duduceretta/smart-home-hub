using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Commands.SetDeviceGroupPower;

public class SetDeviceGroupPowerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
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
}
