using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Realtime.Hubs;

[Authorize]
public class TelemetryHub : Hub
{
    public async Task StartDiscovery(int timeoutSeconds, IDeviceDiscoveryManager discoveryManager)
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (string.IsNullOrEmpty(firebaseUid))
        {
            return;
        }

        await discoveryManager.StartDiscoveryAsync(firebaseUid, timeoutSeconds, Context.ConnectionAborted);
    }

    public async Task StopDiscovery(IDeviceDiscoveryManager discoveryManager)
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (string.IsNullOrEmpty(firebaseUid))
        {
            return;
        }

        await discoveryManager.StopDiscoveryAsync(firebaseUid);
    }

    public override async Task OnConnectedAsync()
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (!string.IsNullOrEmpty(firebaseUid))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{firebaseUid}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (!string.IsNullOrEmpty(firebaseUid))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{firebaseUid}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
