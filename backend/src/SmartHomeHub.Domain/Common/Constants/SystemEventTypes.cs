namespace SmartHomeHub.Domain.Common.Constants;

/// <summary>
/// Vocabulário único de EventType persistidos em SystemEvent, usado por todas as
/// origens de escrita (telemetria, workers de polling/health check, automações,
/// comandos manuais de dispositivo). Conceito de domínio — o hardware e os eventos
/// do sistema não sabem o que é um Command ou uma Query.
/// </summary>
public static class SystemEventTypes
{
    public const string StateChange = "StateChange";
    public const string AutomationTriggered = "AutomationTriggered";
    public const string DeviceOffline = "DeviceOffline";
    public const string DeviceOnline = "DeviceOnline";
    public const string MediaPlayback = "MediaPlayback";
    public const string Alert = "Alert";
    public const string DeviceStatus = "DeviceStatus";
    public const string DeviceMedia = "DeviceMedia";
    public const string Spotify = "Spotify";
    public const string AutomationExecuted = "AutomationExecuted";
}
