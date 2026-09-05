namespace SmartHomeHub.Domain.ValueObjects;

/// <summary>
/// Subconjunto de campos compartilhado por configurações que se conectam
/// diretamente via endereço físico de rede (Tuya local e integrações de
/// rede genéricas/TV — GoogleCast, LgWebOs, AndroidTvAdb, etc.). MQTT
/// nativo não implementa esta interface: o broker resolve o endereço, e
/// nenhum fluxo hoje usa MacAddress para hardware MQTT genérico (só
/// Wake-on-LAN de TV, em <c>SetDeviceStateCommand</c>).
/// </summary>
public interface INetworkAddressableConfiguration : IDeviceConfiguration
{
    string? MacAddress { get; set; }
}
