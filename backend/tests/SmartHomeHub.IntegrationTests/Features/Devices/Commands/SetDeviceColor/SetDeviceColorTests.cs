using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.SetDeviceColor;

public class SetDeviceColorTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuyaLocalControlService =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();

    private void ResetTuyaService() => _tuyaLocalControlService.ClearSubstitute();

    private record DeviceResponse(Guid Id, string? ColorHex);

    private async Task<Device> SeedTuyaLampAsync()
    {
        var user = new User { Name = "Dono da Lâmpada", ExternalAuthUid = "firebase-token-123" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Lâmpada Tuya",
            Brand = "Tuya",
            ExternalId = "tuya-device-abc",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.TuyaLocal,
            Configuration = new DeviceConfiguration
            {
                IpAddress = "192.168.1.50",
                LocalKey = "local-key-123",
            },
            LiveState = new DeviceLiveState { IsOn = true, IsOnline = true },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return device;
    }

    [Fact]
    public async Task SetDeviceColor_TuyaLocalSuccess_ShouldPersistColorAndBeReturnedByGet()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync();

        _tuyaLocalControlService
            .SetColorAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-device-abc"),
                "#FF00AA",
                Arg.Any<CancellationToken>()
            )
            .Returns(Result.Success(new TuyaColorCommandOutcome(null, null, true)));

        var putResponse = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/color",
            new { ColorHex = "#FF00AA" },
            TestContext.Current.CancellationToken
        );

        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        physicalDevice.LiveState.Should().NotBeNull();
        physicalDevice.LiveState!.Attributes.ColorHex.Should().Be("#FF00AA");

        var getResponse = await Client.GetAsync(
            $"/api/devices/{device.Id}",
            TestContext.Current.CancellationToken
        );
        var deviceResponse = await getResponse.Content.ReadFromJsonAsync<DeviceResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        deviceResponse.Should().NotBeNull();
        deviceResponse!.ColorHex.Should().Be("#FF00AA");
    }

    [Fact]
    public async Task SetDeviceColor_TuyaLocalFails_ShouldNotPersistColor()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync();

        _tuyaLocalControlService
            .SetColorAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Result.Failure<TuyaColorCommandOutcome>(
                    new Error("Device.Offline", "Dispositivo Tuya não respondeu (timeout).")
                )
            );

        var putResponse = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/color",
            new { ColorHex = "#00FF00" },
            TestContext.Current.CancellationToken
        );

        putResponse.StatusCode.Should().NotBe(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        (physicalDevice.LiveState?.Attributes.ColorHex)
            .Should()
            .BeNull("o comando falhou — não deve gravar um valor que o hardware não confirmou.");
    }

    [Fact]
    public async Task GetDeviceById_DeviceNeverHadColorSet_ShouldReturnNullColorHexWithoutBreakingSerialization()
    {
        var user = new User { Name = "Dono do Sensor", ExternalAuthUid = "firebase-token-123" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Sensor de Porta",
            Brand = "Aqara",
            ExternalId = "sensor-abc",
            Type = DeviceType.Sensor,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var deviceResponse = await response.Content.ReadFromJsonAsync<DeviceResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        deviceResponse.Should().NotBeNull();
        deviceResponse!.ColorHex.Should().BeNull();
    }
}
