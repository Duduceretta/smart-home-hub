using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroups;

public record DeviceInGroupDto(
    Guid Id,
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    bool IsOn,
    bool IsOnline,
    int? Brightness
);

public record DeviceGroupDto(Guid Id, string Name, string? Icon, List<DeviceInGroupDto> Devices)
{
    /// <summary>
    /// Brilho representativo do grupo (0-100): média arredondada do brilho das
    /// LUZES ONLINE que já têm um valor de brilho confirmado (mesma coluna
    /// write-after-confirm de <c>SetDeviceBrightnessCommand</c>). Null quando
    /// nenhuma luz do grupo atende aos dois critérios (grupo sem luzes, luzes
    /// offline, ou luzes que nunca tiveram brilho ajustado) — o front-end usa
    /// esse null pra cair num fallback neutro em vez de mostrar um número
    /// enganoso. Computado em memória sobre <see cref="Devices"/> já
    /// materializado (não traduzido pro SQL) — este record é reaproveitado
    /// tanto como alvo de projeção do EF Core quanto como resposta da API.
    /// </summary>
    public int? AverageBrightness
    {
        get
        {
            var onlineLightBrightnesses = Devices
                .Where(device =>
                    device.Type == DeviceType.Light && device.IsOnline && device.Brightness.HasValue
                )
                .Select(device => device.Brightness!.Value)
                .ToList();

            return onlineLightBrightnesses.Count == 0
                ? null
                : (int)Math.Round(onlineLightBrightnesses.Average());
        }
    }
}

public record GetDeviceGroupsQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<DeviceGroupDto>>,
        IPagedQuery;

public class GetDeviceGroupsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceGroupsQuery, PagedResult<DeviceGroupDto>>
{
    public async ValueTask<PagedResult<DeviceGroupDto>> Handle(
        GetDeviceGroupsQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(group => group.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(group => group.Name)
            .Select(group => new DeviceGroupDto(
                group.Id,
                group.Name,
                group.Icon,
                group
                    .Devices.Select(device => new DeviceInGroupDto(
                        device.Id,
                        device.Name,
                        device.Brand,
                        device.ExternalId,
                        device.Type,
                        device.LiveState != null && device.LiveState.IsOn,
                        device.LiveState != null && device.LiveState.IsOnline,
                        device.LiveState != null ? device.LiveState.Attributes.Brightness : null
                    ))
                    .ToList()
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
