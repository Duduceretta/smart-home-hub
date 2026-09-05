using Microsoft.EntityFrameworkCore.Diagnostics;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Conversions;

/// <summary>
/// Fecha a lacuna que nenhum ValueConverter cobre sozinho: escolher o tipo
/// concreto de Device.Configuration a partir da coluna irmã
/// Device.IntegrationType, já populada neste ponto do pipeline de
/// materialização do EF Core. Sem este interceptor, toda leitura devolveria
/// o RawDeviceConfiguration cru do ValueConverter (ver
/// DeviceConfigurationValueConverter/DeviceConfigurationJsonSerializer).
/// Registrado em DependencyInjection.AddInfrastructure via AddInterceptors.
/// </summary>
public sealed class DeviceConfigurationMaterializationInterceptor : IMaterializationInterceptor
{
    // Instância única e sem estado, compartilhada entre todos os registros de
    // AddDbContext (produção e testes) — um `new` a cada chamada da options
    // lambda faz o EF Core tratar cada options builder como "diferente"
    // (interceptors entram na igualdade/hash usada pelo cache interno de
    // IServiceProvider), disparando ManyServiceProvidersCreatedWarning e uma
    // nova árvore de serviços internos do EF por escopo.
    public static readonly DeviceConfigurationMaterializationInterceptor Instance = new();

    public object InitializedInstance(
        MaterializationInterceptionData materializationData,
        object instance
    )
    {
        if (instance is Device device)
        {
            device.Configuration = DeviceConfigurationJsonSerializer.Resolve(
                device.Configuration,
                device.IntegrationType
            );
        }

        return instance;
    }
}
