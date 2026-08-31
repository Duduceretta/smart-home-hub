using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.History.Queries.GetEventHistoryStats;

public record EventHistoryStatsDto(
    int TotalEvents,
    int AutomationCount,
    int AlertCount,
    int GroupActionCount
);

public record GetEventHistoryStatsQuery(
    string FirebaseUid,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    Guid? DeviceId = null,
    Guid? RoomId = null,
    Guid? DeviceGroupId = null,
    EventSeverity? Severity = null,
    EventSource? Source = null,
    string? Search = null
) : IQuery<Result<EventHistoryStatsDto>>;

public class GetEventHistoryStatsQueryValidator : AbstractValidator<GetEventHistoryStatsQuery>
{
    public GetEventHistoryStatsQueryValidator()
    {
        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x)
            .Must(x => x.StartDateUtc <= x.EndDateUtc)
            .WithName(nameof(GetEventHistoryStatsQuery.EndDateUtc))
            .WithMessage("A data final não pode ser anterior à data inicial.");
    }
}

/// <summary>
/// Agrega contagens do histórico de eventos no intervalo/filtros informados sem trazer
/// entidades pra memória — espelha exatamente os mesmos filtros de GetEventHistoryQuery,
/// mas devolve totais agregados em vez de uma página de itens, para que os KPIs do
/// front-end reflitam o conjunto filtrado inteiro, não apenas a página carregada.
/// </summary>
public class GetEventHistoryStatsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetEventHistoryStatsQuery, Result<EventHistoryStatsDto>>
{
    public async ValueTask<Result<EventHistoryStatsDto>> Handle(
        GetEventHistoryStatsQuery request,
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
            return Result.Failure<EventHistoryStatsDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var filtered = dbContext
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
            .Where(systemEvent =>
                string.IsNullOrWhiteSpace(request.Search)
                || EF.Functions.Like(
                    systemEvent.Description.ToLower(),
                    $"%{request.Search.Trim().ToLower()}%"
                )
                || (
                    systemEvent.DeviceName != null
                    && EF.Functions.Like(
                        systemEvent.DeviceName.ToLower(),
                        $"%{request.Search.Trim().ToLower()}%"
                    )
                )
                || (
                    systemEvent.RoomName != null
                    && EF.Functions.Like(
                        systemEvent.RoomName.ToLower(),
                        $"%{request.Search.Trim().ToLower()}%"
                    )
                )
                || (
                    systemEvent.DeviceGroupName != null
                    && EF.Functions.Like(
                        systemEvent.DeviceGroupName.ToLower(),
                        $"%{request.Search.Trim().ToLower()}%"
                    )
                )
                || EF.Functions.Like(
                    systemEvent.EventType.ToLower(),
                    $"%{request.Search.Trim().ToLower()}%"
                )
            );

        var totalEvents = await filtered.CountAsync(cancellationToken);

        var automationCount = await filtered.CountAsync(
            systemEvent => systemEvent.Source == EventSource.Automation,
            cancellationToken
        );

        var alertCount = await filtered.CountAsync(
            systemEvent =>
                systemEvent.Severity == EventSeverity.Warning
                || systemEvent.Severity == EventSeverity.Error
                || systemEvent.Severity == EventSeverity.Critical,
            cancellationToken
        );

        var groupActionCount = await filtered.CountAsync(
            systemEvent =>
                systemEvent.Source == EventSource.DeviceGroup
                || systemEvent.DeviceGroupId != null,
            cancellationToken
        );

        return Result.Success(
            new EventHistoryStatsDto(totalEvents, automationCount, alertCount, groupActionCount)
        );
    }
}
