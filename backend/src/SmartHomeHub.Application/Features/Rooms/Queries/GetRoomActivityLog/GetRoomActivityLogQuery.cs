using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Features.Dashboards.Queries.GetActivityLog;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRoomActivityLog;

public record GetRoomActivityLogQuery(
    Guid RoomId,
    string FirebaseUid,
    int Page = 1,
    int PageSize = 10
) : IQuery<Result<PagedResult<ActivityLogEntryDto>>>, IPagedQuery;

public class GetRoomActivityLogQueryValidator : AbstractValidator<GetRoomActivityLogQuery>
{
    public GetRoomActivityLogQueryValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty().WithMessage("O ID do ambiente é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Mesmo shape (<see cref="ActivityLogEntryDto"/>) da Linha do Tempo global
/// (GetActivityLogQuery), filtrado no banco pelos eventos cujo dispositivo
/// pertence a este ambiente — substitui o cruzamento que antes era feito no
/// front-end buscando os últimos N eventos globais e filtrando por
/// deviceId no cliente.
/// </summary>
public class GetRoomActivityLogQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomActivityLogQuery, Result<PagedResult<ActivityLogEntryDto>>>
{
    public async ValueTask<Result<PagedResult<ActivityLogEntryDto>>> Handle(
        GetRoomActivityLogQuery request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (user == null)
            return Result.Failure<PagedResult<ActivityLogEntryDto>>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var room = await dbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == request.RoomId && room.UserId == user.Id,
                cancellationToken
            );

        if (room == null)
            return Result.Failure<PagedResult<ActivityLogEntryDto>>(
                new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso.")
            );

        var pagedResult = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent =>
                systemEvent.User.ExternalAuthUid == request.FirebaseUid
                && systemEvent.Device != null
                && systemEvent.Device.RoomId == request.RoomId
            )
            .OrderByDescending(systemEvent => systemEvent.Timestamp)
            .Select(systemEvent => new ActivityLogEntryDto(
                systemEvent.Id,
                systemEvent.DeviceId,
                systemEvent.EventType,
                systemEvent.Title,
                systemEvent.Description,
                systemEvent.Timestamp,
                systemEvent.IsAlert,
                systemEvent.TraceId
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);

        return Result.Success(pagedResult);
    }
}
