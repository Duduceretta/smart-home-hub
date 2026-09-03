using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Extensions;

public static class AutomationQueryableExtensions
{
    public static IQueryable<Automation> FilterByStatus(
        this IQueryable<Automation> query,
        string? status
    )
    {
        if (string.IsNullOrWhiteSpace(status))
            return query;

        if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
            return query.Where(automation => automation.IsActive);

        if (status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
            return query.Where(automation => !automation.IsActive);

        return query;
    }

    public static IQueryable<Automation> FilterByTriggerKind(
        this IQueryable<Automation> query,
        string? triggerKind
    )
    {
        if (string.IsNullOrWhiteSpace(triggerKind))
            return query;

        if (triggerKind.Equals("schedule", StringComparison.OrdinalIgnoreCase))
            return query.Where(automation =>
                automation.TriggerKind == AutomationTriggerKind.Schedule
            );

        if (triggerKind.Equals("sensor", StringComparison.OrdinalIgnoreCase))
            return query.Where(automation =>
                automation.TriggerKind == AutomationTriggerKind.Sensor
            );

        return query;
    }

    public static IQueryable<Automation> FilterByDraft(
        this IQueryable<Automation> query,
        bool? isDraft
    )
    {
        return isDraft is null ? query : query.Where(automation => automation.IsDraft == isDraft);
    }

    public static IQueryable<Automation> FilterBySearchTerm(
        this IQueryable<Automation> query,
        string? searchTerm
    )
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return query;

        var term = searchTerm.Trim().ToLower();

        return query.Where(automation => EF.Functions.Like(automation.Name.ToLower(), $"%{term}%"));
    }

    // Backend não modela um sort dinâmico completo (nenhuma outra listagem
    // do projeto tem isso ainda) — só os 2 critérios que a UI expõe hoje
    // ("Nome" e "Status"), evitando um parâmetro de sort genérico não usado.
    public static IQueryable<Automation> ApplySort(this IQueryable<Automation> query, string? sort)
    {
        if (sort is not null && sort.Equals("status", StringComparison.OrdinalIgnoreCase))
            return query
                .OrderByDescending(automation => automation.IsActive)
                .ThenBy(automation => automation.Name);

        return query.OrderBy(automation => automation.Name);
    }
}
