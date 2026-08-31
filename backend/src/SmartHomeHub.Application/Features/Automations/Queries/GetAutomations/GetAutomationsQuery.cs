using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetAutomations;

public record AutomationDto(
    Guid Id,
    string Name,
    bool IsActive,
    string RulePayload,
    int SchemaVersion,
    AutomationTriggerKind TriggerKind,
    bool IsDraft,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    /// <summary>
    /// Timestamp da última execução (sucesso ou falha) registrada como
    /// SystemEvent(AutomationExecuted) para essa automação. Null = nunca
    /// executou. Derivado, não é uma coluna em Automation (ver
    /// AutomationRulesEngine — evita bombar Automation.UpdatedAt, que é a
    /// chave de cache da condição compilada).
    /// </summary>
    DateTimeOffset? LastExecutedAt,
    /// <summary>true se alguma execução de hoje (UTC) falhou.</summary>
    bool HasFailedToday
);

public record GetAutomationsQuery(
    string FirebaseUid,
    string? Search = null,
    string? Status = null,
    string? TriggerKind = null,
    bool? IsDraft = null,
    string? Sort = null,
    int Page = 1,
    int PageSize = 10
) : IQuery<PagedResult<AutomationDto>>, IPagedQuery;

public class GetAutomationsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetAutomationsQuery, PagedResult<AutomationDto>>
{
    public async ValueTask<PagedResult<AutomationDto>> Handle(
        GetAutomationsQuery request,
        CancellationToken cancellationToken
    )
    {
        var todayStartUtc = DateTimeOffset.UtcNow.Date;

        return await dbContext
            .Automations.AsNoTracking()
            .Where(automation => automation.User.ExternalAuthUid == request.FirebaseUid)
            .FilterByStatus(request.Status)
            .FilterByTriggerKind(request.TriggerKind)
            .FilterByDraft(request.IsDraft)
            .FilterBySearchTerm(request.Search)
            .ApplySort(request.Sort)
            .Select(automation => new AutomationDto(
                automation.Id,
                automation.Name,
                automation.IsActive,
                automation.RulePayload,
                automation.SchemaVersion,
                automation.TriggerKind,
                automation.IsDraft,
                automation.CreatedAt,
                automation.UpdatedAt,
                dbContext
                    .SystemEvents.Where(systemEvent =>
                        systemEvent.AutomationId == automation.Id
                        && systemEvent.EventType == SystemEventTypes.AutomationExecuted
                    )
                    .OrderByDescending(systemEvent => systemEvent.Timestamp)
                    .Select(systemEvent => (DateTimeOffset?)systemEvent.Timestamp)
                    .FirstOrDefault(),
                dbContext.SystemEvents.Any(systemEvent =>
                    systemEvent.AutomationId == automation.Id
                    && systemEvent.EventType == SystemEventTypes.AutomationExecuted
                    && systemEvent.IsAlert
                    && systemEvent.Timestamp >= todayStartUtc
                )
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
