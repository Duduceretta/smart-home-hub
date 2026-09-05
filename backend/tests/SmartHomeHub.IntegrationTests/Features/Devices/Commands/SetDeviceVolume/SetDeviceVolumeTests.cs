using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
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
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.SetDeviceVolume;

public class SetDeviceVolumeTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IGoogleTvService _googleTvService =
        factory.Services.GetRequiredService<IGoogleTvService>();

    private record SetVolumeRequest(int Volume);

    private void Reset() => _googleTvService.ClearSubstitute();

    private async Task<Device> SeedAndroidTvAsync(string ipAddress)
    {
        var user = new User { Name = "Dono da TV", ExternalAuthUid = "firebase-token-123" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Android TV Sala",
            Brand = "Sony",
            ExternalId = $"ADB-{Guid.NewGuid():N}",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return device;
    }

    [Fact]
    public async Task SetDeviceVolume_WithValidPercentage_ShouldCallGoogleTvServiceAndReturnOk()
    {
        Reset();

        const string ipAddress = "192.168.1.221";
        var device = await SeedAndroidTvAsync(ipAddress);

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/volume",
            new SetVolumeRequest(42),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await _googleTvService
            .Received(1)
            .SetVolumePercentAsync(ipAddress, 42, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task SetDeviceVolume_OutOfRange_ShouldReturn400(int volume)
    {
        Reset();

        var device = await SeedAndroidTvAsync("192.168.1.222");

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/volume",
            new SetVolumeRequest(volume),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await _googleTvService
            .DidNotReceive()
            .SetVolumePercentAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SetDeviceVolume_ForNonTelevisionDevice_ShouldReturnFailure()
    {
        Reset();

        var user = new User { Name = "Dono", ExternalAuthUid = "firebase-token-123" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Lâmpada",
            Brand = "Philips",
            ExternalId = $"LAMP-{Guid.NewGuid():N}",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.NativeMqtt,
        };
        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/volume",
            new SetVolumeRequest(50),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("title").GetString().Should().Be("Device.VolumeUnsupported");
    }

    [Fact]
    public async Task SetDeviceVolume_WhenAdbThrowsHostUnreachable_ShouldReturn400WithSemanticCode()
    {
        Reset();

        var device = await SeedAndroidTvAsync("192.168.1.223");

        _googleTvService
            .SetVolumePercentAsync(
                device.Configuration.IpAddress!,
                Arg.Any<int>(),
                Arg.Any<CancellationToken>()
            )
            .ThrowsAsync(new DeviceUnreachableException(device.Configuration.IpAddress!));

        var response = await Client.PutAsJsonAsync(
            $"/api/devices/{device.Id}/volume",
            new SetVolumeRequest(50),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("title").GetString().Should().Be("Device.HostUnreachable");
    }
}
