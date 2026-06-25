using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.CreateDevice;

public class CreateDeviceTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record CreateDeviceRequest(
        string Name,
        string Brand,
        string ExternalId,
        DeviceType Type,
        Guid? RoomId
    );

    [Fact]
    public async Task CreateDevice_WithValidData_ShouldPersistAndReturnCreated()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateDeviceRequest(
            "Lâmpada Inteligente",
            "Philips Hue",
            "MAC-A1-B2-C3",
            DeviceType.Light,
            null
        );

        var response = await Client.PostAsJsonAsync(
            "/api/devices",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.ExternalId == request.ExternalId,
                cancellationToken: TestContext.Current.CancellationToken
            );

        physicalDevice.Should().NotBeNull();
        physicalDevice.UserId.Should().Be(userId);
        physicalDevice.IsOn.Should().BeFalse("A configuração definiu o DefaultValue como false.");
    }

    [Fact]
    public async Task CreateDevice_WithReusedExternalId_FromDeletedDevice_ShouldSucceed()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var oldDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Lâmpada Queimada",
            Brand = "Generica",
            ExternalId = "MAC-REUSO-99",
            Type = DeviceType.Light,
            IsDeleted = true,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(oldDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateDeviceRequest(
            "Lâmpada Nova",
            "Intelbras",
            "MAC-REUSO-99",
            DeviceType.Light,
            null
        );

        var response = await Client.PostAsJsonAsync(
            "/api/devices",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var deviceCount = await DbContext
            .Devices.IgnoreQueryFilters()
            .CountAsync(
                device => device.ExternalId == "MAC-REUSO-99",
                TestContext.Current.CancellationToken
            );

        deviceCount
            .Should()
            .Be(
                2,
                "Devemos ter o registro antigo (deletado) e o novo (ativo) convivendo pacificamente."
            );
    }

    [Fact]
    public async Task CreateDevice_LinkedToAnotherUsersRoom_ShouldReturnNotFound()
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
            Name = "Vitima",
            ExternalAuthUid = "token-vitima",
        };

        var victimRoom = new Room
        {
            Id = Guid.NewGuid(),
            Name = "Cofre",
            UserId = victimUser.Id,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Rooms.Add(victimRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new CreateDeviceRequest(
            "Câmera Escondida",
            "Espiã",
            "MAC-HACKER-00",
            DeviceType.Camera,
            victimRoom.Id
        );

        var response = await Client.PostAsJsonAsync(
            "/api/devices",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var errorResponse = await response.Content.ReadFromJsonAsync<dynamic>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        string errorCode = errorResponse!.GetProperty("title").GetString();
        errorCode
            .Should()
            .Be(
                "Room.NotFound",
                "O sistema deve agir como se a sala nem existisse para o invasor."
            );
    }
}
