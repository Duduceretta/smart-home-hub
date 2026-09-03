using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Automations.Queries.GetAutomationFilterCounts;

/// <summary>
/// Contagem por categoria (Todas/Ativas/Inativas/Por horário/Por sensor/
/// Rascunhos) usada pela trilha de filtro e pela barra de resumo — precisa
/// ser uma query própria, independente da paginação de `GetAutomationsQuery`:
/// com scroll infinito real, o cliente nunca tem a lista inteira em memória
/// pra contar localmente.
/// </summary>
public record AutomationFilterCountsDto(
    int Total,
    int Active,
    int Inactive,
    int Schedule,
    int Sensor,
    int Draft
);

public record GetAutomationFilterCountsQuery(string FirebaseUid)
    : IQuery<AutomationFilterCountsDto>;

public class GetAutomationFilterCountsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetAutomationFilterCountsQuery, AutomationFilterCountsDto>
{
    public async ValueTask<AutomationFilterCountsDto> Handle(
        GetAutomationFilterCountsQuery request,
        CancellationToken cancellationToken
    )
    {
        var automations = dbContext
            .Automations.AsNoTracking()
            .Where(automation => automation.User.ExternalAuthUid == request.FirebaseUid);

        var total = await automations.CountAsync(cancellationToken);
        var active = await automations.CountAsync(
            automation => automation.IsActive,
            cancellationToken
        );
        var schedule = await automations.CountAsync(
            automation => automation.TriggerKind == AutomationTriggerKind.Schedule,
            cancellationToken
        );
        var sensor = await automations.CountAsync(
            automation => automation.TriggerKind == AutomationTriggerKind.Sensor,
            cancellationToken
        );
        var draft = await automations.CountAsync(
            automation => automation.IsDraft,
            cancellationToken
        );

        return new AutomationFilterCountsDto(
            total,
            active,
            total - active,
            schedule,
            sensor,
            draft
        );
    }
}
