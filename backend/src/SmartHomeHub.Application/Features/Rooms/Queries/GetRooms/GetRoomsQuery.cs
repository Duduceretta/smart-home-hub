using System.Text.Json;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRooms;

public record RoomDto(Guid Id, string Name, string? Icon, int AutomationCount);

public record GetRoomsQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<RoomDto>>,
        IPagedQuery;

/// <summary>
/// AutomationCount é calculado aqui (não num N+1 de <c>GET /rooms/{id}/automations</c>
/// por ambiente feito pelo cliente) — o mesmo cruzamento RulePayload×dispositivo de
/// GetRoomAutomationsQuery, só que rodado uma vez para todos os ambientes da página
/// em vez de uma vez por ambiente. Dispositivos e automações do usuário são buscados
/// inteiros (não só os da página) porque uma automação pode referenciar um
/// dispositivo de qualquer ambiente, não só dos que estão na página atual.
/// </summary>
public class GetRoomsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomsQuery, PagedResult<RoomDto>>
{
    public async ValueTask<PagedResult<RoomDto>> Handle(
        GetRoomsQuery request,
        CancellationToken cancellationToken
    )
    {
        var pagedRooms = await dbContext
            .Rooms.AsNoTracking()
            .Where(room => room.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(room => room.Name)
            .Select(room => new { room.Id, room.Name, room.Icon })
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);

        if (pagedRooms.Items.Count == 0)
            return PagedResult<RoomDto>.Create(
                [],
                pagedRooms.Page,
                pagedRooms.PageSize,
                pagedRooms.TotalCount
            );

        var pagedRoomIds = pagedRooms.Items.Select(room => room.Id).ToList();

        var deviceIdsByRoom = await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.User.ExternalAuthUid == request.FirebaseUid
                && device.RoomId != null
                && pagedRoomIds.Contains(device.RoomId!.Value)
                && !device.IsDeleted
            )
            .GroupBy(device => device.RoomId!.Value)
            .Select(group => new { RoomId = group.Key, DeviceIds = group.Select(d => d.Id) })
            .ToDictionaryAsync(
                group => group.RoomId,
                group => group.DeviceIds.ToHashSet(),
                cancellationToken
            );

        var automations = await dbContext
            .Automations.AsNoTracking()
            .Where(automation => automation.User.ExternalAuthUid == request.FirebaseUid)
            .Select(automation => automation.RulePayload)
            .ToListAsync(cancellationToken);

        var referencedDeviceIdsPerAutomation = new List<HashSet<Guid>>();
        foreach (var rulePayload in automations)
        {
            AutomationPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<AutomationPayload>(
                    rulePayload,
                    AutomationPayloadJsonOptions.Default
                );
            }
            catch (JsonException)
            {
                continue;
            }

            if (payload == null)
                continue;

            var referencedDeviceIds = new HashSet<Guid>();
            foreach (var trigger in payload.Triggers ?? [])
            {
                if (trigger is DeviceStateTrigger deviceStateTrigger)
                    referencedDeviceIds.Add(deviceStateTrigger.DeviceId);
            }
            foreach (var rule in payload.Conditions?.Rules ?? [])
                referencedDeviceIds.Add(rule.DeviceId);
            foreach (var action in payload.Actions ?? [])
                referencedDeviceIds.Add(action.DeviceId);

            referencedDeviceIdsPerAutomation.Add(referencedDeviceIds);
        }

        var items = pagedRooms
            .Items.Select(room =>
            {
                var roomDeviceIds = deviceIdsByRoom.GetValueOrDefault(room.Id, []);
                var automationCount =
                    roomDeviceIds.Count == 0
                        ? 0
                        : referencedDeviceIdsPerAutomation.Count(referenced =>
                            referenced.Overlaps(roomDeviceIds)
                        );

                return new RoomDto(room.Id, room.Name, room.Icon, automationCount);
            })
            .ToList();

        return PagedResult<RoomDto>.Create(
            items,
            pagedRooms.Page,
            pagedRooms.PageSize,
            pagedRooms.TotalCount
        );
    }
}
