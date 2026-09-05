using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Domain.ValueObjects;

/// <summary>
/// Único lugar que conhece a correspondência IntegrationType → categoria de
/// Configuration. Reaproveitado tanto pela materialização do EF Core
/// (Infrastructure, via IMaterializationInterceptor) quanto pelos Handlers
/// que criam dispositivos ou trocam de protocolo (CreateDevice/UpdateDevice)
/// — evita duplicar o switch em cada lugar que precisa decidir o tipo.
/// </summary>
public static class DeviceConfigurationTypeResolver
{
    public static Type Resolve(IntegrationType integrationType) =>
        integrationType switch
        {
            IntegrationType.TuyaLocal => typeof(TuyaDeviceConfiguration),
            IntegrationType.NativeMqtt or IntegrationType.EspHomeMqtt =>
                typeof(MqttDeviceConfiguration),
            _ => typeof(NetworkDeviceConfiguration),
        };

    public static IDeviceConfiguration CreateDefault(IntegrationType integrationType) =>
        (IDeviceConfiguration)Activator.CreateInstance(Resolve(integrationType))!;
}
