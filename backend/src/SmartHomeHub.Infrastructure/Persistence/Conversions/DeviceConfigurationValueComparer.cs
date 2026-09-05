using Microsoft.EntityFrameworkCore.ChangeTracking;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.Persistence.Conversions;

/// <summary>
/// Como Device.Configuration agora é uma propriedade escalar convertida (não
/// mais um Owned Type via ToJson), o EF Core precisa de um ValueComparer
/// explícito para detectar mutação in-place (ex:
/// <c>device.Configuration.IpAddress = "x"</c>, padrão usado em quase todos
/// os Handlers) — sem isso, o change tracker compararia só a referência do
/// objeto e nunca perceberia a mudança. Comparação/hash/snapshot são todos
/// baseados no JSON serializado, o mesmo formato persistido fisicamente.
/// </summary>
public sealed class DeviceConfigurationValueComparer : ValueComparer<IDeviceConfiguration>
{
    public DeviceConfigurationValueComparer()
        : base(
            (a, b) =>
                ReferenceEquals(a, b)
                || (
                    a != null
                    && b != null
                    && DeviceConfigurationJsonSerializer.Serialize(a)
                        == DeviceConfigurationJsonSerializer.Serialize(b)
                ),
            v => DeviceConfigurationJsonSerializer.Serialize(v).GetHashCode(),
            v => DeviceConfigurationJsonSerializer.Clone(v)
        ) { }
}
