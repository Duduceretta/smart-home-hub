using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Queries.GetDevices;

public class GetDevicesTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
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

    public record PagedResponse<T>(
        List<T> Items,
        int Page,
        int PageSize,
        int TotalCount,
        int TotalPages,
        bool HasNextPage,
        bool HasPreviousPage
    );

    [Fact]
    public async Task GetDevices_ShouldReturnOnlyActiveDevices_OwnedByTheLoggedUser()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            ExternalAuthUid = "token-vizinho",
        };

        var myDevice1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Luz 1",
            Brand = "A",
            ExternalId = "MAC-GET-1",
            Type = DeviceType.Light,
        };

        var myDevice2 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Luz 2",
            Brand = "A",
            ExternalId = "MAC-GET-2",
            Type = DeviceType.Light,
        };

        var otherDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            Name = "Luz do Vizinho",
            Brand = "B",
            ExternalId = "MAC-GET-3",
            Type = DeviceType.Light,
        };

        var deletedDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Luz Queimada",
            Brand = "A",
            ExternalId = "MAC-GET-4",
            Type = DeviceType.Light,
            IsDeleted = true,
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.Devices.AddRange(myDevice1, myDevice2, otherDevice, deletedDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync("/api/devices", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<PagedResponse<DeviceResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        pagedResult.Should().NotBeNull();
        pagedResult.Items.Should().HaveCount(2);
        pagedResult.TotalCount.Should().Be(2);

        var returnedIds = pagedResult.Items.Select(device => device.Id).ToList();
        returnedIds.Should().Contain(myDevice1.Id);
        returnedIds.Should().Contain(myDevice2.Id);
        returnedIds.Should().NotContain(otherDevice.Id, "Não deve vazar dados de outros usuários.");
        returnedIds
            .Should()
            .NotContain(deletedDevice.Id, "Não deve retornar dispositivos deletados logicamente.");
    }

    [Fact]
    public async Task GetDevices_WithPaginationParams_ShouldReturnCorrectPageAndMetadata()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var devices = new List<Device>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "A_Luz",
                Brand = "Sonoff",
                ExternalId = "E1",
                Type = DeviceType.Light,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "B_Luz",
                Brand = "Sonoff",
                ExternalId = "E2",
                Type = DeviceType.Light,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "C_Luz",
                Brand = "Sonoff",
                ExternalId = "E3",
                Type = DeviceType.Light,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "D_Luz",
                Brand = "Sonoff",
                ExternalId = "E4",
                Type = DeviceType.Light,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "E_Luz",
                Brand = "Sonoff",
                ExternalId = "E5",
                Type = DeviceType.Light,
            },
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.AddRange(devices);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/devices?page=2&pageSize=2",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<PagedResponse<DeviceResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        pagedResult.Should().NotBeNull();

        pagedResult!.Page.Should().Be(2);
        pagedResult.PageSize.Should().Be(2);
        pagedResult.TotalCount.Should().Be(5);

        pagedResult.Items.Should().HaveCount(2);
        pagedResult.Items[0].Name.Should().Be("C_Luz");
        pagedResult.Items[1].Name.Should().Be("D_Luz");
    }

    [Fact]
    public async Task GetDevices_ShouldReturnDeviceDtoWithExpectedShapeAndLiveStateParity()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Contrato Frontend",
            Email = "frontend@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = loggedUser.Id,
            Name = "Lâmpada Colorida",
            Brand = "Tuya",
            ExternalId = "TUYA-CONTRACT-1",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.TuyaLocal,
            IsOn = false, // valor legado na tabela Device
        };

        var liveState = new DeviceLiveState
        {
            DeviceId = deviceId,
            IsOn = true, // valor live (prioritário)
            IsOnline = true,
            LastSeenAt = DateTimeOffset.UtcNow,
            Attributes = new Domain.ValueObjects.DeviceLiveStateAttributes
            {
                Brightness = 85,
                ColorHex = "#00FF00",
                ColorTempPercent = 50,
            },
        };
        device.LiveState = liveState;

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.Add(device);
        DbContext.DeviceLiveStates.Add(liveState);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices?query=Lâmpada",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("items", out var items).Should().BeTrue();
        items.GetArrayLength().Should().Be(1);

        var item = items[0];

        // Valida todas as propriedades do DTO plano para garantir zero breaking change
        item.GetProperty("id").GetGuid().Should().Be(deviceId);
        item.GetProperty("name").GetString().Should().Be("Lâmpada Colorida");
        item.GetProperty("brand").GetString().Should().Be("Tuya");
        item.GetProperty("externalId").GetString().Should().Be("TUYA-CONTRACT-1");
        item.GetProperty("type").GetInt32().Should().Be((int)DeviceType.Light);
        item.GetProperty("category").GetString().Should().Be("Light");
        item.GetProperty("isOn").GetBoolean().Should().BeTrue("isOn deve vir de DeviceLiveState");
        item.GetProperty("isOnline")
            .GetBoolean()
            .Should()
            .BeTrue("isOnline deve vir de DeviceLiveState");
        item.GetProperty("brightness")
            .GetInt32()
            .Should()
            .Be(85, "brightness deve vir de DeviceLiveState.Attributes");
        item.GetProperty("colorHex")
            .GetString()
            .Should()
            .Be("#00FF00", "colorHex deve vir de DeviceLiveState.Attributes");
        item.GetProperty("colorTempPercent")
            .GetInt32()
            .Should()
            .Be(50, "colorTempPercent deve vir de DeviceLiveState.Attributes");
    }
}
