using Mapster;
using SmartHomeHub.Application.Features.Devices.Queries.GetDevices;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRooms;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Mappings;

public static class MapsterConfiguration
{
    public static void RegisterMappings()
    {
        TypeAdapterConfig<Device, DeviceDto>
            .NewConfig()
            .Map(dest => dest.IpAddress, src => src.Configuration.IpAddress)
            .Map(dest => dest.SupportsColor, src => src.Configuration.SupportsColor == true)
            .Map(dest => dest.SupportsColorOverride, src => src.Configuration.SupportsColor)
            .Map(dest => dest.Category, src => src.Type.ToString())
            .Map(dest => dest.Room, src => src.Room != null ? src.Room.Name : "Sem cômodo")
            .Map(
                dest => dest.IsOnline,
                src => src.LiveState != null ? src.LiveState.IsOnline : src.IsOnline
            )
            .Map(dest => dest.IsOn, src => src.LiveState != null ? src.LiveState.IsOn : src.IsOn)
            .Map(
                dest => dest.Brightness,
                src => src.LiveState != null ? src.LiveState.Attributes.Brightness : src.Brightness
            )
            .Map(
                dest => dest.ColorHex,
                src => src.LiveState != null ? src.LiveState.Attributes.ColorHex : src.ColorHex
            )
            .Map(
                dest => dest.ColorTempPercent,
                src =>
                    src.LiveState != null
                        ? src.LiveState.Attributes.ColorTempPercent
                        : src.ColorTempPercent
            )
            .Map(
                dest => dest.LastActivityMinutes,
                src =>
                    (src.LiveState != null ? src.LiveState.LastSeenAt : src.LastSeenAt).HasValue
                        ? (int)
                            (
                                DateTimeOffset.UtcNow
                                - (
                                    src.LiveState != null
                                        ? src.LiveState.LastSeenAt
                                        : src.LastSeenAt
                                )!.Value
                            ).TotalMinutes
                        : 0
            );

        // AutomationCount não vem do Room em si (é um cruzamento agregado
        // com RulePayload de Automation, feito só em GetRoomsQuery) — 0 fixo
        // aqui evita duplicar esse cruzamento em consumidores que não
        // precisam dele, como GetRoomByIdQuery.
        TypeAdapterConfig<Room, RoomDto>
            .NewConfig()
            .Map(dest => dest.AutomationCount, src => 0);
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
