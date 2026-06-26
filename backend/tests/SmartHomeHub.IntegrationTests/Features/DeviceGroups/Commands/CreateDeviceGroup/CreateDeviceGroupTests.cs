using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.DeviceGroups.Commands.CreateDeviceGroup;

public class CreateDeviceGroupTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record CreateDeviceGroupRequest(string Name, string? Icon, List<Guid> DeviceIds);

    [Fact]
    public async Task CreateDeviceGroup_WithValidDataAndDevices_ShouldCreateAndReturnCreated()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            Email = "eduardo@hub.com",
            ExternalAuthUid = "firebase-token-123",
        };

        var device1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Lâmpada 1",
            Brand = "Tuya",
            ExternalId = "MAC-G1-1",
            Type = DeviceType.Light,
        };
        var device2 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Lâmpada 2",
            Brand = "Tuya",
            ExternalId = "MAC-G1-2",
            Type = DeviceType.Light,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.AddRange(device1, device2);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateDeviceGroupRequest(
            Name: "Iluminação do Quarto",
            Icon: "bed-light",
            DeviceIds: [device1.Id, device2.Id]
        );

        var response = await Client.PostAsJsonAsync(
            "/api/device-groups",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        DbContext.ChangeTracker.Clear();

        var physicalGroup = await DbContext
            .Set<DeviceGroup>()
            .Include(group => group.Devices)
            .FirstOrDefaultAsync(
                group => group.Name == "Iluminação do Quarto",
                TestContext.Current.CancellationToken
            );

        physicalGroup.Should().NotBeNull();
        physicalGroup.UserId.Should().Be(userId);
        physicalGroup.Icon.Should().Be("bed-light");

        physicalGroup.Devices.Should().HaveCount(2);
        physicalGroup
            .Devices.Select(device => device.Id)
            .Should()
            .Contain([device1.Id, device2.Id]);
    }

    [Fact]
    public async Task CreateDeviceGroup_WithDevicesFromAnotherUser_ShouldReturnBadRequest()
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

        var victimDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = victimUser.Id,
            Name = "Câmera Privada",
            Brand = "Intelbras",
            ExternalId = "MAC-VICTIM",
            Type = DeviceType.Camera,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateDeviceGroupRequest(
            Name: "Meus Clones",
            Icon: "hacker-icon",
            DeviceIds: [victimDevice.Id]
        );

        var response = await Client.PostAsJsonAsync(
            "/api/device-groups",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var errorResponse = await response.Content.ReadFromJsonAsync<dynamic>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        string errorCode = errorResponse!.GetProperty("title").GetString();
        errorCode
            .Should()
            .Be(
                "DeviceGroup.InvalidDevices",
                "A barreira de segurança multi-tenant deve bloquear a criação."
            );

        var groupExists = await DbContext
            .Set<DeviceGroup>()
            .AnyAsync(group => group.Name == "Meus Clones", TestContext.Current.CancellationToken);

        groupExists.Should().BeFalse();
    }
}
