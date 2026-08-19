using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Discovery;

public class DeviceDiscoveryEndpointsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IDeviceDiscoveryManager _manager =
        factory.Services.GetRequiredService<IDeviceDiscoveryManager>();

    private record StartDiscoveryRequest(int TimeoutSeconds = 30);

    [Fact]
    public async Task StartDiscoveryEndpoint_ShouldReturnAcceptedAndRegisterSession()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/devices/discovery/start",
            new StartDiscoveryRequest(5),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        await Task.Delay(300, TestContext.Current.CancellationToken);
        _manager.IsDiscoveryRunning("firebase-token-123").Should().BeTrue();

        await _manager.StopDiscoveryAsync("firebase-token-123");
    }

    [Fact]
    public async Task StopDiscoveryEndpoint_ShouldReturnNoContentAndEndSession()
    {
        await _manager.StartDiscoveryAsync("firebase-token-123", 5, CancellationToken.None);
        await Task.Delay(300, TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            "/api/devices/discovery/stop",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        await Task.Delay(200, TestContext.Current.CancellationToken);
        _manager.IsDiscoveryRunning("firebase-token-123").Should().BeFalse();
    }
}
