using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.DeleteDevice;

public class DeleteDeviceTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteDevice_ShouldSoftDelete_AndHideFromCommonQueries()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = userId,
            Name = "Lâmpada do Corredor",
            Brand = "Positivo",
            ExternalId = "MAC-DELETE-TEST",
            Type = DeviceType.Light,
            IsDeleted = false,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/devices/{deviceId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await Client.GetAsync(
            $"/api/devices/{deviceId}",
            TestContext.Current.CancellationToken
        );

        getResponse
            .StatusCode.Should()
            .Be(HttpStatusCode.NotFound, "O Filtro Global deve esconder dispositivos deletados.");

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                device => device.Id == deviceId,
                TestContext.Current.CancellationToken
            );

        physicalDevice
            .Should()
            .NotBeNull("O registro não deve ser apagado com DELETE do banco relacional.");

        physicalDevice!
            .IsDeleted.Should()
            .BeTrue("O interceptador deve ter alterado a flag IsDeleted.");
    }

    [Fact]
    public async Task DeleteDevice_OwnedByAnotherUser_ShouldReturnNotFound()
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
            Name = "Sensor de Janela",
            Brand = "Xiaomi",
            ExternalId = "MAC-XIAOMI-1",
            Type = DeviceType.Sensor,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/devices/{victimDeviceId}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == victimDeviceId,
                TestContext.Current.CancellationToken
            );

        physicalDevice!
            .IsDeleted.Should()
            .BeFalse("Um dispositivo não pode ser deletado por quem não é o dono.");
    }
}
