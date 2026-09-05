using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.Persistence.Conversions;

/// <summary>
/// Placeholder cru devolvido pelo ValueConverter na leitura — carrega o JSON
/// textual sem interpretá-lo, porque um ValueConverter não enxerga a coluna
/// irmã Device.IntegrationType necessária para escolher o tipo concreto.
/// DeviceConfigurationMaterializationInterceptor troca esta instância pela
/// concreta correta assim que o Device inteiro está materializado. Nunca
/// deve sobreviver além desse ponto — todo acesso de aplicação sempre vê
/// TuyaDeviceConfiguration/MqttDeviceConfiguration/NetworkDeviceConfiguration.
/// </summary>
internal sealed class RawDeviceConfiguration(string json) : IDeviceConfiguration
{
    public string Json { get; } = json;

    // IDeviceConfiguration.IpAddress nunca é lido diretamente num
    // RawDeviceConfiguration (o interceptor sempre resolve antes de
    // qualquer código de aplicação tocar a entidade) — implementado só para
    // satisfazer a interface.
    string? IDeviceConfiguration.IpAddress
    {
        get =>
            throw new InvalidOperationException(
                "RawDeviceConfiguration não foi resolvido para o tipo concreto antes do acesso."
            );
        set =>
            throw new InvalidOperationException(
                "RawDeviceConfiguration não foi resolvido para o tipo concreto antes do acesso."
            );
    }
}
