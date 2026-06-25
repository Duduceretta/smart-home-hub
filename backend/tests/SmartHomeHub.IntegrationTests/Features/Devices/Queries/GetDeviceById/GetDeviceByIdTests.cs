using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Queries.GetDeviceById;

public class GetDeviceByIdTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record DeviceResponse(
        Guid Id,
        string Name,
        string Brand,
        string ExternalId,
        DeviceType Type,
        bool IsOn,
        Guid? RoomId
    );

    [Fact]
    public async Task GetDeviceById_WithValidIdAndOwner_ShouldReturnOkAndData()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = userId,
            Name = "Termostato",
            Brand = "Nest",
            ExternalId = "MAC-NEST-1",
            Type = DeviceType.Thermostat,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{deviceId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var deviceResponse = await response.Content.ReadFromJsonAsync<DeviceResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        deviceResponse.Should().NotBeNull();
        deviceResponse!.Id.Should().Be(deviceId);
        deviceResponse.Name.Should().Be("Termostato");
        deviceResponse.ExternalId.Should().Be("MAC-NEST-1");
    }

    [Fact]
    public async Task GetDeviceById_OwnedByAnotherUser_ShouldReturnNotFound()
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

        var victimDeviceId = Guid.NewGuid();
        var victimDevice = new Device
        {
            Id = victimDeviceId,
            UserId = victimUser.Id,
            Name = "Câmera de Segurança",
            Brand = "Intelbras",
            ExternalId = "MAC-CAM-00",
            Type = DeviceType.Camera,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{victimDeviceId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
