using Mapster;
using SmartHomeHub.Application.Features.Devices.Queries.GetDevices;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Mappings;

public static class MapsterConfiguration
{
    public static void RegisterMappings()
    {
        TypeAdapterConfig<Device, DeviceDto>
            .NewConfig()
            .Map(dest => dest.Room, src => src.Room != null ? src.Room.Name : "Sem cômodo")
            .Map(dest => dest.Category, src => GetCategoryFromType(src.Type))
            .Map(
                dest => dest.LastActivityMinutes,
                src =>
                    src.LastSeenAt.HasValue
                        ? (int)(DateTimeOffset.UtcNow - src.LastSeenAt.Value).TotalMinutes
                        : 0
            );
    }

    private static string GetCategoryFromType(DeviceType type) =>
        type switch
        {
            DeviceType.Light => "Iluminação",
            DeviceType.Thermostat => "Climatização",
            DeviceType.Camera or DeviceType.Lock or DeviceType.Alarm => "Segurança",
            DeviceType.Television => "Eletrodomésticos",
            _ => "Outros",
        };
}
