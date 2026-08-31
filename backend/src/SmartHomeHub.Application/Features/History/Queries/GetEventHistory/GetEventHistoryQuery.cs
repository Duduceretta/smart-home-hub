using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.History.Queries.GetEventHistory;

public record EventHistoryDto(
    Guid Id,
    DateTimeOffset TimestampUtc,
    string EventType,
    string Description,
    Guid? DeviceId,
    string? DeviceName,
    Guid? RoomId,
    string? RoomName,
    Guid? DeviceGroupId,
    string? DeviceGroupName,
    string Source,
    string Severity,
    string? OldValue,
    string? NewValue
);

public record GetEventHistoryQuery(
    string FirebaseUid,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    Guid? DeviceId = null,
    Guid? RoomId = null,
    Guid? DeviceGroupId = null,
    EventSeverity? Severity = null,
    EventSource? Source = null,
    int Page = 1,
    int PageSize = 10
) : IQuery<Result<PagedResult<EventHistoryDto>>>, IPagedQuery;

public class GetEventHistoryQueryValidator : AbstractValidator<GetEventHistoryQuery>
{
    private const int MaxPageSize = 100;

    public GetEventHistoryQueryValidator()
    {
        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x.Page).GreaterThan(0).WithMessage("A página deve ser maior que zero.");

        RuleFor(x => x.PageSize)
            .GreaterThan(0)
            .WithMessage("O tamanho da página deve ser maior que zero.")
            .LessThanOrEqualTo(MaxPageSize)
            .WithMessage($"O tamanho da página não pode exceder {MaxPageSize} itens.");

        RuleFor(x => x)
            .Must(x => x.StartDateUtc <= x.EndDateUtc)
            .WithName(nameof(GetEventHistoryQuery.EndDateUtc))
            .WithMessage("A data final não pode ser anterior à data inicial.");
    }
}

/// <summary>
/// Lê o histórico de eventos e auditoria a partir dos snapshots desnormalizados
/// (DeviceName/RoomName/DeviceGroupName) gravados no momento do evento — nunca via join com
/// Devices/Rooms/DeviceGroups, para que renomear ou mover/apagar entidades não altere eventos passados.
/// </summary>
public class GetEventHistoryQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetEventHistoryQuery, Result<PagedResult<EventHistoryDto>>>
{
    public async ValueTask<Result<PagedResult<EventHistoryDto>>> Handle(
        GetEventHistoryQuery request,
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
            return Result.Failure<PagedResult<EventHistoryDto>>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var pagedResult = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent =>
                systemEvent.UserId == user.Id
                && systemEvent.Timestamp >= request.StartDateUtc
                && systemEvent.Timestamp <= request.EndDateUtc
            )
            .Where(systemEvent =>
                request.DeviceId == null || systemEvent.DeviceId == request.DeviceId
            )
            .Where(systemEvent => request.RoomId == null || systemEvent.RoomId == request.RoomId)
            .Where(systemEvent =>
                request.DeviceGroupId == null || systemEvent.DeviceGroupId == request.DeviceGroupId
            )
            .Where(systemEvent =>
                request.Severity == null || systemEvent.Severity == request.Severity
            )
            .Where(systemEvent => request.Source == null || systemEvent.Source == request.Source)
            .OrderByDescending(systemEvent => systemEvent.Timestamp)
            .Select(systemEvent => new EventHistoryDto(
                systemEvent.Id,
                systemEvent.Timestamp,
                systemEvent.EventType,
                systemEvent.Description,
                systemEvent.DeviceId,
                systemEvent.DeviceName,
                systemEvent.RoomId,
                systemEvent.RoomName,
                systemEvent.DeviceGroupId,
                systemEvent.DeviceGroupName,
                systemEvent.Source.ToString(),
                systemEvent.Severity.ToString(),
                systemEvent.OldValue,
                systemEvent.NewValue
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);

        return Result.Success(pagedResult);
    }
}
