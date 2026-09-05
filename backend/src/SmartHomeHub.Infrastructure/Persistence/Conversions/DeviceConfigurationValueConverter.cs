using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.Persistence.Conversions;

/// <summary>
/// Conversor de valor customizado para a coluna jsonb Device.Configuration.
/// Sozinho não é suficiente para escolher o tipo concreto na leitura (não
/// enxerga a coluna irmã IntegrationType da mesma linha) — por isso a
/// leitura devolve um RawDeviceConfiguration pendente, resolvido em seguida
/// por DeviceConfigurationMaterializationInterceptor. Na escrita, serializa
/// pelo tipo em tempo de execução (configuration.GetType()), não pelo tipo
/// declarado da propriedade (IDeviceConfiguration), preservando os campos
/// de cada subtipo concreto.
/// </summary>
public sealed class DeviceConfigurationValueConverter()
    : ValueConverter<IDeviceConfiguration, string>(
        configuration => DeviceConfigurationJsonSerializer.Serialize(configuration),
        json => DeviceConfigurationJsonSerializer.DeserializeRaw(json)
    );
