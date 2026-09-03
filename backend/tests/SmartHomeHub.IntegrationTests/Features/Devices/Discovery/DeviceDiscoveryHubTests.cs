using FluentAssertions;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Discovery;

public class DeviceDiscoveryHubTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IDeviceDiscoveryManager _manager =
        factory.Services.GetRequiredService<IDeviceDiscoveryManager>();

    private HubConnection BuildConnection() =>
        new HubConnectionBuilder()
            .WithUrl(
                new Uri(Factory.Server.BaseAddress, "/hubs/telemetry?access_token=any"),
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => Factory.Server.CreateHandler();
                    options.Transports = HttpTransportType.LongPolling;
                }
            )
            .Build();

    [Fact]
    public async Task StartDiscovery_ShouldRegisterActiveSession()
    {
        await using var connection = BuildConnection();
        await connection.StartAsync(TestContext.Current.CancellationToken);

        await connection.InvokeAsync("StartDiscovery", 5, TestContext.Current.CancellationToken);
        await Task.Delay(300, TestContext.Current.CancellationToken);

        _manager.IsDiscoveryRunning("firebase-token-123").Should().BeTrue();

        await connection.InvokeAsync("StopDiscovery", TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task StopDiscovery_ShouldEndActiveSession()
    {
        await using var connection = BuildConnection();
        await connection.StartAsync(TestContext.Current.CancellationToken);

        await connection.InvokeAsync("StartDiscovery", 5, TestContext.Current.CancellationToken);
        await Task.Delay(300, TestContext.Current.CancellationToken);

        await connection.InvokeAsync("StopDiscovery", TestContext.Current.CancellationToken);
        await Task.Delay(300, TestContext.Current.CancellationToken);

        _manager.IsDiscoveryRunning("firebase-token-123").Should().BeFalse();
    }

    [Fact]
    public async Task DisconnectingConnection_ShouldStopOrphanedSession()
    {
        var connection = BuildConnection();
        await connection.StartAsync(TestContext.Current.CancellationToken);

        await connection.InvokeAsync("StartDiscovery", 30, TestContext.Current.CancellationToken);
        await Task.Delay(300, TestContext.Current.CancellationToken);

        _manager.IsDiscoveryRunning("firebase-token-123").Should().BeTrue();

        await connection.DisposeAsync();
        await Task.Delay(500, TestContext.Current.CancellationToken);

        _manager.IsDiscoveryRunning("firebase-token-123").Should().BeFalse();
    }
}
