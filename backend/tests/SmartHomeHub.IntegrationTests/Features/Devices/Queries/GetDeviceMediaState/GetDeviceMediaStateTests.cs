using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Queries.GetDeviceMediaState;

public class GetDeviceMediaStateTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IGoogleTvService _googleTvService =
        factory.Services.GetRequiredService<IGoogleTvService>();

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
            Configuration = new DeviceConfiguration { IpAddress = ipAddress },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return device;
    }

    [Fact]
    public async Task GetDeviceMediaState_ForAndroidTv_ShouldReturnVolumeAndMediaFromService()
    {
        Reset();

        const string ipAddress = "192.168.1.231";
        var device = await SeedAndroidTvAsync(ipAddress);

        _googleTvService.GetVolumePercentAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(72);
        _googleTvService
            .GetMediaSessionInfoAsync(ipAddress, Arg.Any<CancellationToken>())
            .Returns(new MediaSessionInfo("Filme X", "Estúdio Y", true));

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/media",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<DeviceMediaStateDto>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        body.Should().NotBeNull();
        body!.VolumePercent.Should().Be(72);
        body.IsPlaying.Should().BeTrue();
        body.Title.Should().Be("Filme X");
        body.Artist.Should().Be("Estúdio Y");
    }

    [Fact]
    public async Task GetDeviceMediaState_ForDeviceOwnedByAnotherUser_ShouldReturnNotFound()
    {
        Reset();

        var victimUser = new User { Name = "Vítima", ExternalAuthUid = "token-vitima" };
        var victimDevice = new Device
        {
            UserId = victimUser.Id,
            Name = "TV da Vítima",
            Brand = "Sony",
            ExternalId = $"ADB-{Guid.NewGuid():N}",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new DeviceConfiguration { IpAddress = "192.168.1.232" },
        };
        DbContext.Users.Add(victimUser);
        DbContext.Devices.Add(victimDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{victimDevice.Id}/media",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
