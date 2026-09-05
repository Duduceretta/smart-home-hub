using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Extensions;

public static class IntegrationTypeExtensions
{
    // MQTT/LWT (NativeMqtt, EspHomeMqtt) e integrações via nuvem (TuyaBridge, Zigbee)
    // gerenciam o próprio ciclo de vida de conectividade — probe ativo é redundante.
    // Decisão depende só de IntegrationType (nunca de Configuration), por isso
    // também é seguro traduzir pra SQL — ver DeviceHealthCheckWorker, que usa
    // este mesmo array num Where() pra não trazer do banco dispositivos que
    // cairiam fora aqui de qualquer forma. Fonte única: nunca duplicar esta
    // lista em outro lugar.
    public static readonly IntegrationType[] NonProbeableIntegrationTypes =
    [
        IntegrationType.NativeMqtt,
        IntegrationType.EspHomeMqtt,
        IntegrationType.TuyaBridge,
        IntegrationType.Zigbee,
    ];

    public static bool IsNetworkProbeable(this IntegrationType type) =>
        !NonProbeableIntegrationTypes.Contains(type);

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
