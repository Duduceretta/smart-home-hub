using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetAutomationExecutionsByWeekday;

/// <summary>Contagem de execuções num dia da semana — sempre os 7 dias presentes, zerados quando não há execução.</summary>
public record AutomationWeekdayExecutionDto(DayOfWeek DayOfWeek, int Count);

public record GetAutomationExecutionsByWeekdayQuery(
    Guid AutomationId,
    string FirebaseUid,
    int SinceDays = 30
) : IQuery<IReadOnlyList<AutomationWeekdayExecutionDto>>;

public class GetAutomationExecutionsByWeekdayQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<
        GetAutomationExecutionsByWeekdayQuery,
        IReadOnlyList<AutomationWeekdayExecutionDto>
    >
{
    public async ValueTask<IReadOnlyList<AutomationWeekdayExecutionDto>> Handle(
        GetAutomationExecutionsByWeekdayQuery request,
        CancellationToken cancellationToken
    )
    {
        var sinceUtc = DateTimeOffset.UtcNow.AddDays(-request.SinceDays);

        var counts = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent =>
                systemEvent.AutomationId == request.AutomationId
                && systemEvent.EventType == ActivityEventTypes.AutomationExecuted
                && systemEvent.User.ExternalAuthUid == request.FirebaseUid
                && systemEvent.Timestamp >= sinceUtc
            )
            .GroupBy(systemEvent => systemEvent.Timestamp.DayOfWeek)
            .Select(group => new { DayOfWeek = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        // Sempre os 7 dias, zerados quando não há execução — senão o gráfico
        // de barras no frontend desalinha (index != dia da semana).
        return Enum.GetValues<DayOfWeek>()
            .Select(day => new AutomationWeekdayExecutionDto(
                day,
                counts.FirstOrDefault(count => count.DayOfWeek == day)?.Count ?? 0
            ))
            .ToList();
    }
}
