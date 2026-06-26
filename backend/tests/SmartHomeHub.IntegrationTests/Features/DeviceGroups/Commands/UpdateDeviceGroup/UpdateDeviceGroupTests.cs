using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Commands.UpdateDeviceGroup;

public class UpdateDeviceGroupTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record UpdateDeviceGroupRequest(string Name, string? Icon, List<Guid> DeviceIds);

    [Fact]
    public async Task UpdateDeviceGroup_WithValidData_ShouldUpdateGroupAndDevices()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var device1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Luz 1",
            Brand = "A",
            ExternalId = "MAC-U1",
            Type = DeviceType.Light,
        };
        var device2 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Luz 2",
            Brand = "A",
            ExternalId = "MAC-U2",
            Type = DeviceType.Light,
        };
        var device3 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Luz 3",
            Brand = "A",
            ExternalId = "MAC-U3",
            Type = DeviceType.Light,
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Grupo Antigo",
            Icon = "old-icon",
            Devices = [device1, device2],
        };

        DbContext.Users.Add(user);
        DbContext.Devices.AddRange(device1, device2, device3);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateDeviceGroupRequest(
            Name: "Novo Nome do Grupo",
            Icon: "new-icon",
            DeviceIds: [device2.Id, device3.Id]
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{group.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        DbContext.ChangeTracker.Clear();

        var physicalGroup = await DbContext
            .Set<DeviceGroup>()
            .Include(group => group.Devices)
            .FirstOrDefaultAsync(
                group => group.Id == group.Id,
                TestContext.Current.CancellationToken
            );

        physicalGroup.Should().NotBeNull();
        physicalGroup.Name.Should().Be("Novo Nome do Grupo");
        physicalGroup.Icon.Should().Be("new-icon");

        physicalGroup.Devices.Should().HaveCount(2);
        var currentDeviceIds = physicalGroup.Devices.Select(device => device.Id).ToList();

        currentDeviceIds.Should().Contain(device2.Id, "O Device 2 foi mantido na lista.");
        currentDeviceIds
            .Should()
            .Contain(device3.Id, "O Device 3 foi inserido na tabela intermediária.");
        currentDeviceIds
            .Should()
            .NotContain(
                device1.Id,
                "O Device 1 deve ter sido deletado da tabela intermediária pelo EF."
            );
    }

    [Fact]
    public async Task UpdateDeviceGroup_WithEmptyDeviceList_ShouldClearAllRelationships()
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
            Name = "Luz",
            Brand = "A",
            ExternalId = "MAC-E1",
            Type = DeviceType.Light,
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Grupo Cheio",
            Devices = [device],
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateDeviceGroupRequest("Grupo Vazio", "icon", []);

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{group.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        DbContext.ChangeTracker.Clear();
        var physicalGroup = await DbContext
            .Set<DeviceGroup>()
            .Include(group => group.Devices)
            .FirstOrDefaultAsync(
                group => group.Id == group.Id,
                TestContext.Current.CancellationToken
            );

        physicalGroup!
            .Devices.Should()
            .BeEmpty("O EF Core deve ter deletado todos os vínculos N:M.");
    }

    [Fact]
    public async Task UpdateDeviceGroup_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Hacker",
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

        var request = new UpdateDeviceGroupRequest("Hackeado", null, []);

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{victimGroup.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateDeviceGroup_AddingDeviceFromAnotherUser_ShouldReturnBadRequest()
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

        var myGroup = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Meu Grupo",
        };
        var victimDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = victimUser.Id,
            Name = "Luz Vítima",
            Brand = "A",
            ExternalId = "MAC-V",
            Type = DeviceType.Light,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.DeviceGroups.Add(myGroup);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateDeviceGroupRequest("Meu Grupo Alterado", null, [victimDevice.Id]);

        var response = await Client.PutAsJsonAsync(
            $"/api/device-groups/{myGroup.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var errorResponse = await response.Content.ReadFromJsonAsync<dynamic>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        string errorCode = errorResponse!.GetProperty("title").GetString();
        errorCode.Should().Be("DeviceGroup.InvalidDevices");
    }
}
