using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetNextScheduledAutomation;

public record NextScheduledAutomationDto(Guid AutomationId, string Name, DateTimeOffset NextRunUtc);

public record GetNextScheduledAutomationQuery(string FirebaseUid)
    : IQuery<NextScheduledAutomationDto?>;

/// <summary>
/// Cruza os Recurring Jobs Schedule ativos (via <see cref="IAutomationScheduleReader"/>,
/// nunca recalculando cron na mão) com a tabela Automations, e devolve a
/// execução mais próxima entre as do usuário logado.
/// </summary>
public class GetNextScheduledAutomationQueryHandler(
    IAppDbContext dbContext,
    IAutomationScheduleReader scheduleReader
) : IQueryHandler<GetNextScheduledAutomationQuery, NextScheduledAutomationDto?>
{
    public async ValueTask<NextScheduledAutomationDto?> Handle(
        GetNextScheduledAutomationQuery request,
        CancellationToken cancellationToken
    )
    {
        // Recurring Jobs são globais (não sabem de dono) — os candidatos
        // brutos daqui ainda precisam ser cruzados com Automations
        // (User + IsActive) antes de confiar em qualquer um deles.
        var nextRunsByAutomationId = scheduleReader.GetNextRunsByAutomationId();

        if (nextRunsByAutomationId.Count == 0)
        {
            return null;
        }

        var ownedActiveAutomations = await dbContext
            .Automations.AsNoTracking()
            .Where(automation =>
                automation.User.ExternalAuthUid == request.FirebaseUid
                && automation.IsActive
                && automation.TriggerKind == AutomationTriggerKind.Schedule
                && nextRunsByAutomationId.Keys.Contains(automation.Id)
            )
            .Select(automation => new { automation.Id, automation.Name })
            .ToListAsync(cancellationToken);

        return ownedActiveAutomations
            .Select(automation => new NextScheduledAutomationDto(
                automation.Id,
                automation.Name,
                nextRunsByAutomationId[automation.Id]
            ))
            .OrderBy(dto => dto.NextRunUtc)
            .FirstOrDefault();
    }
}
