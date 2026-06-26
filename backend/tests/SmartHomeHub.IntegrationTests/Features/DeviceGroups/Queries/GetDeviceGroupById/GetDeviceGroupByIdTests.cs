using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Queries.GetDeviceGroupById;

public class GetDeviceGroupByIdTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record DeviceInGroupResponse(
        Guid Id,
        string Name,
        string Brand,
        string ExternalId,
        DeviceType Type,
        bool IsOn
    );

    private record DeviceGroupResponse(
        Guid Id,
        string Name,
        string? Icon,
        List<DeviceInGroupResponse> Devices
    );

    [Fact]
    public async Task GetDeviceGroupById_WithValidIdAndOwner_ShouldReturnOkAndData()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Tomada",
            Brand = "Tuya",
            ExternalId = "MAC-T",
            Type = DeviceType.Switch,
        };
        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Cozinha",
            Icon = "kitchen",
            Devices = [device],
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/device-groups/{group.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var groupResponse = await response.Content.ReadFromJsonAsync<DeviceGroupResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        groupResponse.Should().NotBeNull();
        groupResponse.Id.Should().Be(group.Id);
        groupResponse.Name.Should().Be("Cozinha");
        groupResponse.Icon.Should().Be("kitchen");
        groupResponse.Devices.Should().HaveCount(1);
        groupResponse.Devices.First().Name.Should().Be("Tomada");
    }

    [Fact]
    public async Task GetDeviceGroupById_OwnedByAnotherUser_ShouldReturnNotFound()
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
            Name = "Garagem",
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.DeviceGroups.Add(victimGroup);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/device-groups/{victimGroup.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
