using SmartHomeHub.Infrastructure.Realtime.Hubs;

namespace SmartHomeHub.Api.Endpoints;

public static class HubEndpoints
{
    public static void MapHubEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapHub<TelemetryHub>("/hubs/telemetry")
            .RequireAuthorization()
            .WithTags("⚡ Realtime (WebSockets)")
            .WithSummary("Hub SignalR de Telemetria e Status em Tempo Real")
            .WithDescription(
                "Conexão WebSocket autenticada via Firebase JWT (parâmetro `access_token` na query string). "
                    + "Eventos emitidos para o cliente: `DeviceStatusChanged` (ligar/desligar/queda) e `ReceiveTelemetryUpdate` (watts/temperatura)."
            );
    }
}
