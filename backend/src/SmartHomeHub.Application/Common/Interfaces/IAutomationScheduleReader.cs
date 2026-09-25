namespace SmartHomeHub.Application.Common.Interfaces;

/// <summary>
/// Lê o `NextExecution` já calculado pelo agendador (Hangfire, hoje) pra
/// cada automação Schedule com um Recurring Job ativo — nunca recalcula
/// cron por conta própria, pra nunca divergir do que realmente vai disparar
/// (ver <see cref="IAutomationSchedulerService"/>, dono da escrita).
/// </summary>
public interface IAutomationScheduleReader
{
    IReadOnlyDictionary<Guid, DateTimeOffset> GetNextRunsByAutomationId();
}
