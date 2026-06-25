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

        var devices = await response.Content.ReadFromJsonAsync<List<DeviceResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        devices.Should().NotBeNull();

        devices!.Should().HaveCount(2);

        var returnedIds = devices.Select(device => device.Id).ToList();
        returnedIds.Should().Contain(myDevice1.Id);
        returnedIds.Should().Contain(myDevice2.Id);
        returnedIds.Should().NotContain(otherDevice.Id, "Não deve vazar dados de outros usuários.");
        returnedIds
            .Should()
            .NotContain(deletedDevice.Id, "Não deve retornar dispositivos deletados logicamente.");
    }
}
