using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Features.Dashboards.Queries.GetActivityLog;
using SmartHomeHub.Domain.Common.Constants;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetAutomationExecutionHistory;

/// <summary>
/// Histórico de execução de UMA automação — mesmo dado/formato da Linha do
/// Tempo global (GetActivityLogQuery), só que filtrado por AutomationId em
/// vez de por usuário. Reaproveita ActivityLogEntryDto de propósito: é o
/// mesmo SystemEvent(AutomationExecuted), só uma lente diferente sobre ele.
/// </summary>
public record GetAutomationExecutionHistoryQuery(
    Guid AutomationId,
    string FirebaseUid,
    int Page = 1,
    int PageSize = 10
) : IQuery<PagedResult<ActivityLogEntryDto>>, IPagedQuery;

public class GetAutomationExecutionHistoryQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetAutomationExecutionHistoryQuery, PagedResult<ActivityLogEntryDto>>
{
    public async ValueTask<PagedResult<ActivityLogEntryDto>> Handle(
        GetAutomationExecutionHistoryQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent =>
                systemEvent.AutomationId == request.AutomationId
                && systemEvent.EventType == SystemEventTypes.AutomationExecuted
                && systemEvent.User.ExternalAuthUid == request.FirebaseUid
            )
            .OrderByDescending(systemEvent => systemEvent.Timestamp)
            .Select(systemEvent => new ActivityLogEntryDto(
                systemEvent.Id,
                systemEvent.DeviceId,
                systemEvent.EventType,
                systemEvent.Title,
                systemEvent.Description,
                systemEvent.Timestamp,
                systemEvent.IsAlert
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
