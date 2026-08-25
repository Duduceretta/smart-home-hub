namespace SmartHomeHub.Application.Features.Dashboards.ActivityLog;

/// <summary>
/// Tipos de EventType persistidos em SystemEvent para entradas geradas pela
/// Linha do Tempo do dashboard (distintos dos EventTypes livres usados por
/// outras origens de SystemEvent, ex: "Security").
/// </summary>
public static class ActivityEventTypes
{
    public const string DeviceStatus = "DeviceStatus";
    public const string DeviceMedia = "DeviceMedia";
    public const string Spotify = "Spotify";
}

/// <summary>
/// Constrói o par (Title, Description) da Linha do Tempo — centralizado aqui
/// porque três origens diferentes (ProcessTelemetryCommand, DeviceHealthCheckWorker,
/// DeviceStatePollingWorker) precisam gerar o mesmo texto para o mesmo tipo de
/// evento, evitando divergência entre elas.
/// </summary>
public static class ActivityLogMessages
{
    public static (string Title, string Description) DeviceStatusChanged(
        string deviceName,
        string? roomName,
        bool isOn,
        bool isOnline
    )
    {
        if (!isOnline)
            return ($"{deviceName} ficou offline", "Conexão perdida com o dispositivo.");

        var title = $"{deviceName} {(isOn ? "ligado" : "desligado")}";
        var description = roomName != null ? $"Ambiente: {roomName}" : "Estado atualizado.";

        return (title, description);
    }

    public static (string Title, string Description) DeviceMediaChanged(
        string title,
        string? artist
    )
    {
        return ("Nova reprodução na TV", artist != null ? $"{title} — {artist}" : title);
    }

    public static (string Title, string Description) SpotifyPlaybackChanged(
        bool isPlaying,
        string title,
        string? artist
    )
    {
        var eventTitle = isPlaying ? "Spotify reproduzindo" : "Spotify pausado";
        var description = artist != null ? $"{title} — {artist}" : title;

        return (eventTitle, description);
    }
}
