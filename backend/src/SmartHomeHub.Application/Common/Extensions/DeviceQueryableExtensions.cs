using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Extensions;

public static class DeviceQueryableExtensions
{
    public static IQueryable<Device> FilterByCategory(
        this IQueryable<Device> query,
        string? category
    )
    {
        if (
            string.IsNullOrWhiteSpace(category)
            || category.Equals("Todos", StringComparison.OrdinalIgnoreCase)
        )
            return query;

        var allowedTypes = GetDeviceTypesFromCategory(category);
        return allowedTypes.Count != 0
            ? query.Where(device => allowedTypes.Contains(device.Type))
            : query;
    }

    public static IQueryable<Device> FilterByStatus(this IQueryable<Device> query, string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return query;

        if (status.Equals("online", StringComparison.OrdinalIgnoreCase))
            return query.Where(device =>
                device.LiveState != null ? device.LiveState.IsOnline : device.IsOnline
            );

        if (status.Equals("offline", StringComparison.OrdinalIgnoreCase))
            return query.Where(device =>
                device.LiveState != null ? !device.LiveState.IsOnline : !device.IsOnline
            );

        return query;
    }

    public static IQueryable<Device> FilterByRoomId(this IQueryable<Device> query, Guid? roomId)
    {
        return roomId is null ? query : query.Where(device => device.RoomId == roomId);
    }

    public static IQueryable<Device> FilterByOnlyOn(this IQueryable<Device> query, bool? onlyOn)
    {
        return onlyOn == true
            ? query.Where(device => device.LiveState != null ? device.LiveState.IsOn : device.IsOn)
            : query;
    }

    public static IQueryable<Device> FilterBySearchTerm(
        this IQueryable<Device> query,
        string? searchTerm
    )
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return query;

        var term = searchTerm.Trim().ToLower();

        return query.Where(device =>
            EF.Functions.Like(device.Name.ToLower(), $"%{term}%")
            || EF.Functions.Like(device.Brand.ToLower(), $"%{term}%")
            || EF.Functions.Like(device.ExternalId.ToLower(), $"%{term}%")
            || (device.Room != null && EF.Functions.Like(device.Room.Name.ToLower(), $"%{term}%"))
        );
    }

    private static List<DeviceType> GetDeviceTypesFromCategory(string category) =>
        category.ToLower() switch
        {
            "iluminação" or "iluminacao" => [DeviceType.Light],
            "climatização" or "climatizacao" => [DeviceType.Thermostat],
            "segurança" or "seguranca" => [DeviceType.Camera, DeviceType.Lock, DeviceType.Alarm],
            "eletrodomésticos" or "eletrodomesticos" => [DeviceType.Television, DeviceType.Switch],
            _ => [],
        };
}
