using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.UpdateDevice;

public class UpdateDeviceTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record UpdateDeviceRequest(
        string Name,
        string Brand,
        string ExternalId,
        DeviceType Type,
        Guid? RoomId
    );

    [Fact]
    public async Task UpdateDevice_WithValidDataAndRoom_ShouldUpdateAndReturnOk()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };

        var roomId = Guid.NewGuid();
        var room = new Room
        {
            Id = roomId,
            Name = "Sala de Estar",
            UserId = userId,
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = userId,
            Name = "Lâmpada Antiga",
            Brand = "Genérica",
            ExternalId = "MAC-VELHO",
            Type = DeviceType.Light,
            RoomId = null,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateDeviceRequest(
            "Lâmpada Nova Smart",
            "Philips",
            "MAC-NOVO",
            DeviceType.Light,
            roomId
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{deviceId}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == deviceId,
                TestContext.Current.CancellationToken
            );

        physicalDevice.Should().NotBeNull();
        physicalDevice.Name.Should().Be("Lâmpada Nova Smart");
        physicalDevice.Brand.Should().Be("Philips");
        physicalDevice.ExternalId.Should().Be("MAC-NOVO");
        physicalDevice.RoomId.Should().Be(roomId);
    }

    [Fact]
    public async Task UpdateDevice_OwnedByAnotherUser_ShouldReturnNotFound()
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

        var victimDeviceId = Guid.NewGuid();
        var victimDevice = new Device
        {
            Id = victimDeviceId,
            UserId = victimUser.Id,
            Name = "Fechadura da Porta",
            Brand = "Intelbras",
            ExternalId = "MAC-FECHADURA",
            Type = DeviceType.Lock,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateDeviceRequest(
            "Fechadura Hackeada",
            "Intelbras",
            "MAC-FECHADURA",
            DeviceType.Lock,
            null
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{victimDeviceId}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var errorResponse = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        string? errorCode = errorResponse.GetProperty("title").GetString();
        errorCode.Should().Be("Device.NotFound");
    }

    [Fact]
    public async Task UpdateDevice_MovingToAnotherUsersRoom_ShouldReturnNotFound()
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

        var myDeviceId = Guid.NewGuid();
        var myDevice = new Device
        {
            Id = myDeviceId,
            UserId = loggedUser.Id,
            Name = "Minha Câmera",
            Brand = "Geral",
            ExternalId = "MAC-1",
            Type = (DeviceType)2,
        };

        var victimRoomId = Guid.NewGuid();
        var victimRoom = new Room
        {
            Id = victimRoomId,
            UserId = victimUser.Id,
            Name = "Quarto da Vítima",
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Devices.Add(myDevice);
        DbContext.Rooms.Add(victimRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateDeviceRequest(
            "Minha Câmera",
            "Geral",
            "MAC-1",
            DeviceType.Camera,
            victimRoomId
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{myDeviceId}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var errorResponse = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        string? errorCode = errorResponse.GetProperty("title").GetString();
        errorCode.Should().Be("Room.NotFound");
    }
}
