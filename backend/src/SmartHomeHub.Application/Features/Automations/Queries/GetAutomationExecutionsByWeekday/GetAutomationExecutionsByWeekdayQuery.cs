using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Constants;

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

        // Conta DISPAROS (TraceId distintos), não linhas de SystemEvent — uma
        // automação com N ações gera N linhas com o mesmo TraceId por disparo,
        // e contar linhas infla a contagem em N vezes. Eventos sem TraceId
        // (registros legados de antes da coluna existir) caem no fallback do
        // próprio Id — cada linha sem TraceId ainda conta como um disparo distinto,
        // em vez de colapsar todos os nulos num único grupo.
        var counts = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent =>
                systemEvent.AutomationId == request.AutomationId
                && systemEvent.EventType == SystemEventTypes.AutomationExecuted
                && systemEvent.User.ExternalAuthUid == request.FirebaseUid
                && systemEvent.Timestamp >= sinceUtc
            )
            .GroupBy(systemEvent => systemEvent.Timestamp.DayOfWeek)
            .Select(group => new
            {
                DayOfWeek = group.Key,
                Count = group
                    .Select(systemEvent => systemEvent.TraceId ?? systemEvent.Id.ToString())
                    .Distinct()
                    .Count(),
            })
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
