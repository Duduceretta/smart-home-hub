using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetAutomations;

public record AutomationDto(
    Guid Id,
    string Name,
    bool IsActive,
    string RulePayload,
    int SchemaVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);

public record GetAutomationsQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<AutomationDto>>,
        IPagedQuery;

public class GetAutomationsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetAutomationsQuery, PagedResult<AutomationDto>>
{
    public async ValueTask<PagedResult<AutomationDto>> Handle(
        GetAutomationsQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Automations.AsNoTracking()
            .Where(automation => automation.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(automation => automation.Name)
            .Select(automation => new AutomationDto(
                automation.Id,
                automation.Name,
                automation.IsActive,
                automation.RulePayload,
                automation.SchemaVersion,
                automation.CreatedAt,
                automation.UpdatedAt
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
