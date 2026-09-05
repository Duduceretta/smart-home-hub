namespace SmartHomeHub.Domain.ValueObjects;

/// <summary>
/// Configuração de hardware MQTT genérico (Sonoff/Tasmota/ESPHome) —
/// telemetria em <c>home/telemetry/{ExternalId}</c>, comandos em
/// <c>home/commands/{ExternalId}</c> (ver CLAUDE.md).
/// </summary>
public sealed class MqttDeviceConfiguration : IDeviceConfiguration
{
    // Populado via ProcessTelemetryCommand a partir do payload recebido —
    // só informativo/diagnóstico (device não é "network probeable"; ver
    // IntegrationTypeExtensions.IsNetworkProbeable).
    public string? IpAddress { get; set; }

    public string? ClientKey { get; set; }
    public string? CommandTopic { get; set; }
    public string? StateTopic { get; set; }
}
