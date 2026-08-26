using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Queries.GetAutomations;

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
                automation.CreatedAt,
                automation.UpdatedAt
            ))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
