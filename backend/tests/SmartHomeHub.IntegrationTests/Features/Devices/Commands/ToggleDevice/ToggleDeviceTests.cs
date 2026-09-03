using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using NSubstitute.ExceptionExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.ToggleDevice;

public class ToggleDeviceTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private readonly IWakeOnLanService _wakeOnLanService =
        factory.Services.GetRequiredService<IWakeOnLanService>();
    private readonly IGoogleTvService _googleTvService =
        factory.Services.GetRequiredService<IGoogleTvService>();
    private readonly IChromecastWakeService _chromecastWakeService =
        factory.Services.GetRequiredService<IChromecastWakeService>();

    private void ResetTvServices()
    {
        _wakeOnLanService.ClearReceivedCalls();
        _googleTvService.ClearSubstitute();
        _chromecastWakeService.ClearReceivedCalls();
    }

    private async Task<(User User, Device Device)> SeedTelevisionAsync(
        string? macAddress,
        bool isOn
    )
    {
        var user = new User { Name = "Dono da TV", ExternalAuthUid = "firebase-token-123" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "TV da Sala",
            Brand = "Google",
            ExternalId = $"CAST-{Guid.NewGuid():N}",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.GoogleCast,
            IsOn = isOn,
            Configuration = new DeviceConfiguration
            {
                IpAddress = "192.168.1.150",
                MacAddress = macAddress,
            },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return (user, device);
    }

    [Fact]
    public async Task ToggleDevice_TurningOnTvWithMacAddress_ShouldSendWakeOnLan()
    {
        ResetTvServices();

        const string macAddress = "AA:BB:CC:11:22:33";
        var (_, device) = await SeedTelevisionAsync(macAddress, isOn: false);

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await _wakeOnLanService
            .Received(1)
            .SendMagicPacketAsync(macAddress, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ToggleDevice_TurningOnAndroidTv_ShouldSendWakeOnLanThenAdbWakeUpKeycode()
    {
        ResetTvServices();

        const string macAddress = "AA:BB:CC:11:22:33";
        var (_, device) = await SeedTelevisionAsync(macAddress, isOn: false);

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        Received.InOrder(() =>
        {
            _wakeOnLanService.SendMagicPacketAsync(macAddress, Arg.Any<CancellationToken>());
            _googleTvService.SendKeycodeAsync(
                device.Configuration.IpAddress!,
                224,
                Arg.Any<CancellationToken>()
            );
        });
    }

    [Fact]
    public async Task ToggleDevice_WhenAdbFailsTransientlyOnFirstAttempt_ShouldRetryOnceAndSucceed()
    {
        ResetTvServices();

        var (_, device) = await SeedTelevisionAsync(macAddress: null, isOn: false);
        var ipAddress = device.Configuration.IpAddress!;

        var callCount = 0;
        _googleTvService
            .SendKeycodeAsync(ipAddress, 224, Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                callCount++;
                if (callCount == 1)
                    throw new DeviceUnreachableException(ipAddress);
                return Task.CompletedTask;
            });

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await _googleTvService
            .Received(2)
            .SendKeycodeAsync(ipAddress, 224, Arg.Any<CancellationToken>());
        await _chromecastWakeService
            .DidNotReceive()
            .WakeUpAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ToggleDevice_WhenAdbFailsBothAttempts_ShouldFallBackToChromecastWake()
    {
        ResetTvServices();

        var (_, device) = await SeedTelevisionAsync(macAddress: null, isOn: false);
        var ipAddress = device.Configuration.IpAddress!;

        _googleTvService
            .SendKeycodeAsync(ipAddress, 224, Arg.Any<CancellationToken>())
            .ThrowsAsync(new DeviceUnreachableException(ipAddress));

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await _googleTvService
            .Received(2)
            .SendKeycodeAsync(ipAddress, 224, Arg.Any<CancellationToken>());
        await _chromecastWakeService
            .Received(1)
            .WakeUpAsync(ipAddress, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ToggleDevice_WhenChromecastFallbackThrows_ShouldNotBreakFlow()
    {
        ResetTvServices();

        var (_, device) = await SeedTelevisionAsync(macAddress: null, isOn: false);
        var ipAddress = device.Configuration.IpAddress!;

        _googleTvService
            .SendKeycodeAsync(ipAddress, 224, Arg.Any<CancellationToken>())
            .ThrowsAsync(new DeviceUnreachableException(ipAddress));
        _chromecastWakeService
            .WakeUpAsync(ipAddress, Arg.Any<CancellationToken>())
            .ThrowsAsync(new TimeoutException("The operation has timed out"));

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalDevice = await DbContext
            .Devices.AsNoTracking()
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        physicalDevice
            .IsOn.Should()
            .BeTrue("mesmo com timeout residual do Cast, o toggle deve concluir.");
    }

    [Fact]
    public async Task ToggleDevice_TurningOnTvWithoutMac_ShouldSkipWakeOnLan()
    {
        ResetTvServices();

        var (_, device) = await SeedTelevisionAsync(macAddress: null, isOn: false);

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await _wakeOnLanService
            .DidNotReceive()
            .SendMagicPacketAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ToggleDevice_WhenAdbThrowsUnauthorized_ShouldReturn403WithSemanticCode()
    {
        ResetTvServices();

        var (_, device) = await SeedTelevisionAsync(macAddress: null, isOn: true);

        _googleTvService
            .SendKeycodeAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new AdbUnauthorizedException(device.Configuration.IpAddress!));

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("title").GetString().Should().Be("Device.AdbUnauthorized");
    }

    [Fact]
    public async Task ToggleDevice_WhenAdbThrowsHostUnreachable_ShouldReturn400WithSemanticCode()
    {
        ResetTvServices();

        var (_, device) = await SeedTelevisionAsync(macAddress: null, isOn: true);

        _googleTvService
            .SendKeycodeAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new DeviceUnreachableException(device.Configuration.IpAddress!));

        var response = await Client.PostAsync(
            $"/api/devices/{device.Id}/toggle",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("title").GetString().Should().Be("Device.HostUnreachable");
    }

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

        physicalDeviceAfterFirstToggle
            .Should()
            .NotBeNull("O dispositivo deve continuar existindo após a primeira requisição.");

        physicalDeviceAfterFirstToggle
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

        physicalDeviceAfterSecondToggle
            .Should()
            .NotBeNull("O dispositivo deve continuar existindo após a segunda requisição.");

        physicalDeviceAfterSecondToggle
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

        physicalDevice.Should().NotBeNull("O dispositivo do vizinho deve continuar existindo.");
        physicalDevice.IsOn.Should().BeFalse("O estado não pode ser alterado por terceiros.");
    }
}
