using System.Text.Json;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.Persistence.Conversions;

/// <summary>
/// (De)serialização de Device.Configuration para a coluna física jsonb, sem
/// nenhum discriminador embutido no documento — o tipo concreto é sempre
/// resolvido a partir da coluna relacional Device.IntegrationType (ver
/// DeviceConfigurationTypeResolver), nunca de uma marca dentro do próprio
/// JSON. Opções padrão do System.Text.Json (nomes de propriedade
/// PascalCase, iguais aos membros C#) preservam byte a byte o formato já
/// gravado por dispositivos reais (documentado antes desta refatoração
/// pela extinta OwnsOne(...).ToJson() em DeviceConfiguration) — ver teste de
/// compatibilidade retroativa em DeviceConfigurationJsonSerializerTests.
/// </summary>
public static class DeviceConfigurationJsonSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static string Serialize(IDeviceConfiguration configuration) =>
        configuration is RawDeviceConfiguration raw
            ? raw.Json
            : JsonSerializer.Serialize(configuration, configuration.GetType(), Options);

    public static IDeviceConfiguration DeserializeRaw(string json) =>
        new RawDeviceConfiguration(json);

    /// <summary>
    /// Troca um RawDeviceConfiguration pendente pelo tipo concreto indicado
    /// por <paramref name="integrationType"/>. Instâncias já concretas
    /// (entidades novas, ainda não passadas pelo banco) retornam inalteradas.
    /// </summary>
    public static IDeviceConfiguration Resolve(
        IDeviceConfiguration configuration,
        IntegrationType integrationType
    )
    {
        if (configuration is not RawDeviceConfiguration raw)
            return configuration;

        var targetType = DeviceConfigurationTypeResolver.Resolve(integrationType);

        return (IDeviceConfiguration?)JsonSerializer.Deserialize(raw.Json, targetType, Options)
            ?? DeviceConfigurationTypeResolver.CreateDefault(integrationType);
    }

    public static IDeviceConfiguration Clone(IDeviceConfiguration configuration) =>
        (IDeviceConfiguration)
            JsonSerializer.Deserialize(Serialize(configuration), configuration.GetType(), Options)!;
}
