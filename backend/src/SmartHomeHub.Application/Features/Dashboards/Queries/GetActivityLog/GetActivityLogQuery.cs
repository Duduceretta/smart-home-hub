using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;

namespace SmartHomeHub.Application.Features.Dashboards.Queries.GetActivityLog;

public record ActivityLogEntryDto(
    Guid Id,
    Guid? DeviceId,
    string EventType,
    string Title,
    string Description,
    DateTimeOffset Timestamp,
    bool IsAlert,
    string? TraceId
);

public record GetActivityLogQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<ActivityLogEntryDto>>,
        IPagedQuery;

public class GetActivityLogQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetActivityLogQuery, PagedResult<ActivityLogEntryDto>>
{
    public async ValueTask<PagedResult<ActivityLogEntryDto>> Handle(
        GetActivityLogQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent => systemEvent.User.ExternalAuthUid == request.FirebaseUid)
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
    }
}
