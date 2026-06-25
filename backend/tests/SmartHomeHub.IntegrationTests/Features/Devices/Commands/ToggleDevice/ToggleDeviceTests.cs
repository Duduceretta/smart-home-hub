using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.ToggleDevice;

public class ToggleDeviceTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task ToggleDevice_ShouldInvertDeviceState_AndReturnOk()
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
            Name = "Luz da Garagem",
            Brand = "Sonoff",
            ExternalId = "MAC-TOGGLE-1",
            Type = DeviceType.Light,
            IsOn = false,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response1 = await Client.PostAsync(
            $"/api/devices/{deviceId}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDeviceAfterFirstToggle = await DbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == deviceId,
                TestContext.Current.CancellationToken
            );

        physicalDeviceAfterFirstToggle!
            .IsOn.Should()
            .BeTrue("O dispositivo começou 'false', deve ser alterado para 'true'.");

        var response2 = await Client.PostAsync(
            $"/api/devices/{deviceId}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDeviceAfterSecondToggle = await DbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == deviceId,
                TestContext.Current.CancellationToken
            );

        physicalDeviceAfterSecondToggle!
            .IsOn.Should()
            .BeFalse("A segunda requisição deve inverter o 'true' de volta para 'false'.");
    }

    [Fact]
    public async Task ToggleDevice_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho Curioso",
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
            Name = "Sirene de Alarme",
            Brand = "Intelbras",
            ExternalId = "MAC-ALARME",
            Type = DeviceType.Alarm,
            IsOn = false,
        };

        DbContext.Users.AddRange(loggedUser, victimUser);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/devices/{victimDeviceId}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == victimDeviceId,
                TestContext.Current.CancellationToken
            );

        physicalDevice!.IsOn.Should().BeFalse("O estado não pode ser alterado por terceiros.");
    }
}
