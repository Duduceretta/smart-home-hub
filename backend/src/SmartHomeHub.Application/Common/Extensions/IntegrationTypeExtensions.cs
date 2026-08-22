using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Extensions;

public static class IntegrationTypeExtensions
{
    // MQTT/LWT (NativeMqtt, EspHomeMqtt) e integrações via nuvem (TuyaBridge, Zigbee)
    // gerenciam o próprio ciclo de vida de conectividade — probe ativo é redundante.
    public static bool IsNetworkProbeable(this IntegrationType type) =>
        type switch
        {
            IntegrationType.NativeMqtt
            or IntegrationType.EspHomeMqtt
            or IntegrationType.TuyaBridge
            or IntegrationType.Zigbee => false,
            _ => true,
        };

    public static IReadOnlyList<int> GetProbeCandidatePorts(this IntegrationType type) =>
        type switch
        {
            IntegrationType.GoogleCast => [8009],
            IntegrationType.AndroidTvAdb => [5555],
            IntegrationType.TuyaLocal => [6668, 6667],
            IntegrationType.LgWebOs => [3000, 3001],
            IntegrationType.MdnsZeroconf or IntegrationType.SsdpUpnp => [80, 8080],
            _ => [],
        };

    // LgWebOs usa o protocolo WebOS SSAP (não ADB) — comandos via adb shell
    // (keycodes, volume, dumpsys) só se aplicam a GoogleCast/AndroidTvAdb.
    public static bool IsAdbControllable(this IntegrationType type) =>
        type is IntegrationType.GoogleCast or IntegrationType.AndroidTvAdb;
}
