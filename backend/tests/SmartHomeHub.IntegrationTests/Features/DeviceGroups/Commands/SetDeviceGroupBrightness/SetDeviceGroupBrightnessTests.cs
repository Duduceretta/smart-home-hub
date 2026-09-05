using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Commands.SetDeviceGroupBrightness;

public class SetDeviceGroupBrightnessTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record BulkBrightnessResponse(int SucceededCount, int FailedCount, int TotalCount);

    [Fact]
    public async Task SetBrightness_ShouldAdjustOnlyOnlineLightsInGroup()
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
            Name = "Luzes da Sala",
        };

        var offlineLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz Offline",
            Brand = "Philips",
            ExternalId = "GRP-BRI-1",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = false, IsOn = false },
        };

        var onlineLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz Online",
            Brand = "Tuya",
            ExternalId = "GRP-BRI-2",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        var onlineSwitch = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Tomada Online",
            Brand = "Sonoff",
            ExternalId = "GRP-BRI-3",
            Type = DeviceType.Switch,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        group.Devices.Add(offlineLight);
        group.Devices.Add(onlineLight);
        group.Devices.Add(onlineSwitch);

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{group.Id}/devices/brightness",
            new { BrightnessPercent = 60 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<BulkBrightnessResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!
            .TotalCount.Should()
            .Be(1, "apenas a luz online do grupo é elegível para ajuste de brilho");
    }

    [Fact]
    public async Task SetBrightness_WhenGroupHasNoLights_ShouldReturnZeroedResult()
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
            Name = "Só Tomadas",
        };

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{group.Id}/devices/brightness",
            new { BrightnessPercent = 60 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<BulkBrightnessResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task SetBrightness_OwnedByAnotherUser_ShouldReturnNotFound()
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

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{victimGroup.Id}/devices/brightness",
            new { BrightnessPercent = 60 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
