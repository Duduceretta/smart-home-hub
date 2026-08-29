using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Queries.GetAutomations;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetAutomationById;

public record GetAutomationByIdQuery(Guid AutomationId, string FirebaseUid)
    : IQuery<AutomationDto?>;

public class GetAutomationByIdQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetAutomationByIdQuery, AutomationDto?>
{
    public async ValueTask<AutomationDto?> Handle(
        GetAutomationByIdQuery request,
        CancellationToken cancellationToken
    )
    {
        var todayStartUtc = DateTimeOffset.UtcNow.Date;

        return await dbContext
            .Automations.AsNoTracking()
            .Where(automation =>
                automation.Id == request.AutomationId
                && automation.User.ExternalAuthUid == request.FirebaseUid
            )
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
                        && systemEvent.EventType == ActivityEventTypes.AutomationExecuted
                    )
                    .OrderByDescending(systemEvent => systemEvent.Timestamp)
                    .Select(systemEvent => (DateTimeOffset?)systemEvent.Timestamp)
                    .FirstOrDefault(),
                dbContext.SystemEvents.Any(systemEvent =>
                    systemEvent.AutomationId == automation.Id
                    && systemEvent.EventType == ActivityEventTypes.AutomationExecuted
                    && systemEvent.IsAlert
                    && systemEvent.Timestamp >= todayStartUtc
                )
            ))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
