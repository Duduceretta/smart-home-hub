using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.SetDeviceState;

public class SetDeviceStateTuyaLocalTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuyaLocalControlService =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();

    private void ResetTuyaService() => _tuyaLocalControlService.ClearSubstitute();

    private async Task<Device> SeedTuyaLampAsync(bool isOn)
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
            IsOn = isOn,
            IsOnline = true,
            Configuration = new DeviceConfiguration
            {
                IpAddress = "192.168.1.50",
                LocalKey = "local-key-123",
            },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return device;
    }

    [Fact]
    public async Task ToggleDevice_TuyaLocalSuccess_ShouldPersistConfirmedStateFromDevice()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync(isOn: false);

        _tuyaLocalControlService
            .SetPowerStateAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == "tuya-device-abc"),
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Domain.Common.Primitives.Result.Success(new TuyaCommandOutcome(true, null, null))
            );

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        physicalDevice.LiveState.Should().NotBeNull();
        physicalDevice.LiveState!.IsOn.Should().BeTrue();
        physicalDevice.LiveState.IsOnline.Should().BeTrue();
    }

    [Fact]
    public async Task ToggleDevice_TuyaLocalResolvesFreshIpAndDp_ShouldPersistResolvedConfiguration()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync(isOn: false);

        _tuyaLocalControlService
            .SetPowerStateAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Domain.Common.Primitives.Result.Success(
                    new TuyaCommandOutcome(true, "192.168.1.77", "20")
                )
            );

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        physicalDevice.Configuration.IpAddress.Should().Be("192.168.1.77");
        physicalDevice.Configuration.DpsPowerKey.Should().Be("20");
    }

    [Fact]
    public async Task ToggleDevice_TuyaLocalOffline_ShouldNotChangeIsOnAndShouldMarkOffline()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync(isOn: false);

        _tuyaLocalControlService
            .SetPowerStateAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Domain.Common.Primitives.Result.Failure<TuyaCommandOutcome>(
                    new Domain.Common.Primitives.Error(
                        "Device.Offline",
                        "Dispositivo Tuya não respondeu (timeout)."
                    )
                )
            );

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().NotBe(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        (physicalDevice.LiveState != null ? physicalDevice.LiveState.IsOn : physicalDevice.IsOn)
            .Should()
            .BeFalse("comando não confirmado — a UI não deve mostrar ligado.");
        (
            physicalDevice.LiveState != null
                ? physicalDevice.LiveState.IsOnline
                : physicalDevice.IsOnline
        )
            .Should()
            .BeFalse();
    }

    [Fact]
    public async Task ToggleDevice_TuyaLocalMissingLocalKey_ShouldFailWithoutCallingService()
    {
        ResetTuyaService();

        var device = await SeedTuyaLampAsync(isOn: false);
        device.Configuration.LocalKey = null;
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().NotBe(HttpStatusCode.OK);

        await _tuyaLocalControlService
            .DidNotReceive()
            .SetPowerStateAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }
}
