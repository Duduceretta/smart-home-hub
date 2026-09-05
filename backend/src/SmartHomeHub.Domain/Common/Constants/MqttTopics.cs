namespace SmartHomeHub.Domain.Common.Constants;

/// <summary>
/// Tópicos e prefixos padronizados MQTT usados para telemetria, comandos de dispositivos
/// e status do sistema.
/// </summary>
public static class MqttTopics
{
    public const string CommandPrefix = "home/commands/";
    public const string TelemetryPrefix = "home/telemetry/";
    public const string StatusPrefix = "home/status/";
    public const string BackendStatus = "home/status/backend";
    public const string GlobalWildcard = "home/#";

    public static string CommandFor(string externalId) => $"{CommandPrefix}{externalId}";

    public static string TelemetryFor(string externalId) => $"{TelemetryPrefix}{externalId}";

    public static string StatusFor(string externalId) => $"{StatusPrefix}{externalId}";
}
