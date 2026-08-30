namespace SmartHomeHub.Domain.ValueObjects;

public class DeviceConfiguration
{
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? LocalKey { get; set; }

    // "3.3", "3.4", "3.5"... null/ausente = legado (TuyaNetProtocolClient, v3.1/v3.3).
    public string? ProtocolVersion { get; set; }
    public string? DpsPowerKey { get; set; } = "20";
    public string? ClientKey { get; set; }
    public string? CommandTopic { get; set; }
    public string? StateTopic { get; set; }
}
