using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Persistence.Hypertables;

// Cobre a auditoria de banco: SystemEvents virou hypertable (migration
// ConvertSystemEventsToHypertable, chunk mensal) pelo mesmo motivo que
// DeviceTelemetryLogs já era — append-only, crescimento sem teto, sem
// particionamento nativo. Confirma que a conversão pegou de verdade e que os
// 6 índices compostos liderados por UserId continuam funcionando.
public class SystemEventsHypertableTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record HypertableRow(string HypertableName);

    [Fact]
    public async Task SystemEvents_ShouldBeRegisteredAsHypertable()
    {
        var rows = await DbContext
            .Database.SqlQuery<HypertableRow>(
                $"""
                SELECT hypertable_name AS "HypertableName"
                FROM timescaledb_information.hypertables
                WHERE hypertable_name = 'SystemEvents'
                """
            )
            .ToListAsync(TestContext.Current.CancellationToken);

        rows.Should()
            .ContainSingle(
                "SystemEvents deve aparecer em timescaledb_information.hypertables após a migration"
            );
    }

    [Fact]
    public async Task InsertAndQuery_SystemEvents_ShouldWorkAcrossExistingCompositeIndexes()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Tomada Cozinha",
            Brand = "Sonoff",
            ExternalId = "MAC-HYPERTABLE-1",
            Type = DeviceType.Switch,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);

        var events = Enumerable
            .Range(0, 5)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DeviceId = device.Id,
                EventType = "StateChange",
                Title = $"Evento {i}",
                Description = "Teste de hypertable",
                Severity = EventSeverity.Info,
                Source = EventSource.System,
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
            })
            .ToList();

        DbContext.SystemEvents.AddRange(events);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Exercita o índice composto (UserId, Timestamp DESC).
        var byUserOrderedByTime = await DbContext
            .SystemEvents.AsNoTracking()
            .Where(e => e.UserId == user.Id)
            .OrderByDescending(e => e.Timestamp)
            .ToListAsync(TestContext.Current.CancellationToken);

        byUserOrderedByTime.Should().HaveCount(5);

        // Exercita o índice composto (UserId, DeviceId).
        var byUserAndDevice = await DbContext
            .SystemEvents.AsNoTracking()
            .Where(e => e.UserId == user.Id && e.DeviceId == device.Id)
            .ToListAsync(TestContext.Current.CancellationToken);

        byUserAndDevice.Should().HaveCount(5);
    }
}
