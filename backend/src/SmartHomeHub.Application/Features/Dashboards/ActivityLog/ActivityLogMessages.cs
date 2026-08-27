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
    public const string AutomationExecuted = "AutomationExecuted";
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

    /// <summary>
    /// Só o eixo de energia (ligado/desligado) — para origens que só sabem
    /// detectar essa transição (ex: DeviceStatePollingWorker via ADB). Não
    /// gateia em IsOnline: usar DeviceStatusChanged aqui erra o texto sempre
    /// que o outro eixo (conectividade) estiver desatualizado no momento da
    /// leitura, já que os dois workers rodam em ciclos independentes.
    /// </summary>
    public static (string Title, string Description) DevicePowerStateChanged(
        string deviceName,
        string? roomName,
        bool isOn
    )
    {
        var title = $"{deviceName} {(isOn ? "ligado" : "desligado")}";
        var description = roomName != null ? $"Ambiente: {roomName}" : "Estado atualizado.";

        return (title, description);
    }

    /// <summary>
    /// Só o eixo de conectividade (online/offline) — para origens que só
    /// sabem detectar essa transição (ex: DeviceHealthCheckWorker via probe
    /// de rede). Mesmo motivo do DevicePowerStateChanged: não depende do
    /// IsOn atual, que pode estar desatualizado nesse worker.
    /// </summary>
    public static (string Title, string Description) DeviceConnectivityChanged(
        string deviceName,
        string? roomName,
        bool isOnline
    )
    {
        var title = $"{deviceName} {(isOnline ? "ficou online" : "ficou offline")}";
        var description = isOnline
            ? roomName != null
                ? $"Ambiente: {roomName}"
                : "Conexão restabelecida."
            : "Conexão perdida com o dispositivo.";

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

    /// <summary>
    /// Resultado de uma ação disparada por automação (AutomationActionDispatcher).
    /// Chamado tanto no caminho de sucesso quanto no de falha (lógica ou por
    /// exceção) — o texto de erro já vem pronto do Result/exceção, não é
    /// recalculado aqui.
    /// </summary>
    public static (string Title, string Description) AutomationExecutionResult(
        string automationName,
        string deviceName,
        bool success,
        string? errorMessage
    )
    {
        if (success)
            return ($"{automationName} disparou", $"Ação executada em {deviceName}.");

        var description = errorMessage != null
            ? $"Falha ao acionar {deviceName}: {errorMessage}"
            : $"Falha ao acionar {deviceName}.";

        return ($"{automationName} falhou", description);
    }
}
