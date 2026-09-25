using Hangfire;
using Hangfire.Storage;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Scheduling;

public sealed class AutomationScheduleReader(JobStorage jobStorage) : IAutomationScheduleReader
{
    // Mesmo prefixo de AutomationSchedulerService.JobId — nunca duplicar o
    // literal sem sincronizar os dois se um dia mudar.
    private const string JobIdPrefix = "automation_time_";

    public IReadOnlyDictionary<Guid, DateTimeOffset> GetNextRunsByAutomationId()
    {
        // GetRecurringJobs() só existe na classe concreta JobStorageConnection,
        // não na interface IStorageConnection (mesmo cast do teste de
        // integração de CreateAutomation).
        using var connection = (JobStorageConnection)jobStorage.GetConnection();

        var nextRuns = new Dictionary<Guid, DateTimeOffset>();

        foreach (var job in connection.GetRecurringJobs())
        {
            if (!job.NextExecution.HasValue || !job.Id.StartsWith(JobIdPrefix))
                continue;

            if (!Guid.TryParse(job.Id[JobIdPrefix.Length..], out var automationId))
                continue;

            // Hangfire retorna NextExecution em UTC (Kind Unspecified na
            // prática) — DateTimeOffset com offset zero é a leitura correta,
            // não local.
            nextRuns[automationId] = new DateTimeOffset(job.NextExecution.Value, TimeSpan.Zero);
        }

        return nextRuns;
    }
}
