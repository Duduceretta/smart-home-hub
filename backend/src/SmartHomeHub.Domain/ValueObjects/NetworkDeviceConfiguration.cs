namespace SmartHomeHub.Domain.ValueObjects;

/// <summary>
/// Configuração para integrações de rede que não são nem Tuya local nem
/// MQTT nativo — TVs via GoogleCast/LgWebOs/AndroidTvAdb, TuyaBridge (Tuya
/// via nuvem), Zigbee, mDNS/SSDP. Hoje só usam IP/MAC; nenhuma delas
/// persiste segredo ou DP específico de protocolo.
/// </summary>
public sealed class NetworkDeviceConfiguration : INetworkAddressableConfiguration
{
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
}
