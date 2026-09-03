using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.CreateDevice;

public class CreateDeviceTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private readonly TestDeviceProbeService _probeService =
        factory.Services.GetRequiredService<TestDeviceProbeService>();
    private readonly IGoogleTvService _googleTvService =
        factory.Services.GetRequiredService<IGoogleTvService>();

    private record CreateDeviceRequest(
        string Name,
        string Brand,
        string ExternalId,
        DeviceType Type,
        IntegrationType IntegrationType,
        Guid? RoomId,
        string? IpAddress = null
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
            IntegrationType.NativeMqtt,
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
    public async Task CreateDevice_WhenProbeSucceeds_ShouldPersistAsOnline()
    {
        _probeService.Reset();

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

        const string ipAddress = "192.168.1.77";
        _probeService.SetResult(ipAddress, true);

        var request = new CreateDeviceRequest(
            "Chromecast Sala",
            "Google",
            "CAST-A1-B2-C3",
            DeviceType.Television,
            IntegrationType.GoogleCast,
            null,
            ipAddress
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
        physicalDevice!.IsOnline.Should().BeTrue();
        physicalDevice.LastSeenAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateDevice_TelevisionWithPowerOn_ShouldPersistAsOn()
    {
        _googleTvService.ClearSubstitute();

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

        const string ipAddress = "192.168.1.88";
        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        var request = new CreateDeviceRequest(
            "Android TV Quarto",
            "Sony",
            "ADB-A1-B2-C3",
            DeviceType.Television,
            IntegrationType.AndroidTvAdb,
            null,
            ipAddress
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
        physicalDevice!.IsOn.Should().BeTrue();
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
            IntegrationType.NativeMqtt,
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
            IntegrationType.NativeMqtt,
            victimRoom.Id
        );

        var response = await Client.PostAsJsonAsync(
            "/api/devices",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var errorResponse = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        string? errorCode = errorResponse.GetProperty("title").GetString();
        errorCode
            .Should()
            .Be(
                "Room.NotFound",
                "O sistema deve agir como se a sala nem existisse para o invasor."
            );
    }
}
