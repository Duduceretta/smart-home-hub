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

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.SetDeviceBrightness;

public class SetDeviceBrightnessTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuyaLocalControlService =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();

    private void ResetTuyaService() => _tuyaLocalControlService.ClearSubstitute();

    private record DeviceResponse(Guid Id, int? Brightness);

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
            Configuration = new TuyaDeviceConfiguration
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
    public async Task SetDeviceBrightness_TuyaLocalSuccess_ShouldPersistBrightnessAndBeReturnedByGet()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync();

        _tuyaLocalControlService
            .SetBrightnessAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-device-abc"),
                65,
                Arg.Any<CancellationToken>()
            )
            .Returns(Result.Success(new TuyaBrightnessCommandOutcome(null, null)));

        var putResponse = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/brightness",
            new { BrightnessPercent = 65 },
            TestContext.Current.CancellationToken
        );

        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        physicalDevice.LiveState.Should().NotBeNull();
        physicalDevice.LiveState!.Attributes.Brightness.Should().Be(65);

        var getResponse = await Client.GetAsync(
            $"/api/devices/{device.Id}",
            TestContext.Current.CancellationToken
        );
        var deviceResponse = await getResponse.Content.ReadFromJsonAsync<DeviceResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        deviceResponse.Should().NotBeNull();
        deviceResponse!.Brightness.Should().Be(65);
    }

    [Fact]
    public async Task SetDeviceBrightness_TuyaLocalFails_ShouldNotPersistBrightness()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync();

        _tuyaLocalControlService
            .SetBrightnessAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                Arg.Any<int>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Result.Failure<TuyaBrightnessCommandOutcome>(
                    new Error("Device.Offline", "Dispositivo Tuya não respondeu (timeout).")
                )
            );

        var putResponse = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/brightness",
            new { BrightnessPercent = 40 },
            TestContext.Current.CancellationToken
        );

        putResponse.StatusCode.Should().NotBe(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        (physicalDevice.LiveState?.Attributes.Brightness)
            .Should()
            .BeNull("o comando falhou — não deve gravar um valor que o hardware não confirmou.");
    }

    [Fact]
    public async Task GetDeviceById_DeviceNeverHadBrightnessSet_ShouldReturnNullBrightnessWithoutBreakingSerialization()
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
        deviceResponse!.Brightness.Should().BeNull();
    }
}
