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

    private record CompressionSettingRow(
        string HypertableName,
        string Attname,
        int? SegmentbyColumnIndex,
        int? OrderbyColumnIndex
    );

    private record CompressionJobRow(string HypertableName);

    [Fact]
    public async Task SystemEvents_ShouldHaveCompressionPolicyConfigured()
    {
        var settings = await DbContext
            .Database.SqlQuery<CompressionSettingRow>(
                $"""
                SELECT
                    hypertable_name AS "HypertableName",
                    attname AS "Attname",
                    segmentby_column_index AS "SegmentbyColumnIndex",
                    orderby_column_index AS "OrderbyColumnIndex"
                FROM timescaledb_information.compression_settings
                WHERE hypertable_name = 'SystemEvents'
                """
            )
            .ToListAsync(TestContext.Current.CancellationToken);

        settings.Should().NotBeEmpty("SystemEvents deve ter compressão configurada no TimescaleDB");
        settings
            .Should()
            .Contain(
                s => s.Attname == "UserId" && s.SegmentbyColumnIndex != null,
                "UserId deve ser segmentby"
            );
        settings
            .Should()
            .Contain(
                s => s.Attname == "EventType" && s.SegmentbyColumnIndex != null,
                "EventType deve ser segmentby"
            );
        settings
            .Should()
            .Contain(
                s => s.Attname == "Timestamp" && s.OrderbyColumnIndex != null,
                "Timestamp deve ser orderby"
            );

        var jobs = await DbContext
            .Database.SqlQuery<CompressionJobRow>(
                $"""
                SELECT hypertable_name AS "HypertableName"
                FROM timescaledb_information.jobs
                WHERE proc_name = 'policy_compression' AND hypertable_name = 'SystemEvents'
                """
            )
            .ToListAsync(TestContext.Current.CancellationToken);

        jobs.Should()
            .ContainSingle("a job de policy_compression deve estar registrada para SystemEvents");
    }

    [Fact]
    public async Task QuerySystemEvents_ByUserDeviceAndTimestampRange_ShouldUseCompositeTemporalIndexWithoutSort()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = $"uid-explain-{Guid.NewGuid():N}",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Tomada Sala",
            Brand = "Sonoff",
            ExternalId = $"MAC-COMPOSITE-{Guid.NewGuid():N}",
            Type = DeviceType.Switch,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);

        var now = DateTimeOffset.UtcNow;
        var events = Enumerable
            .Range(0, 10)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DeviceId = device.Id,
                EventType = "StateChange",
                Title = $"Evento {i}",
                Description = "Teste de plano de execução",
                Severity = EventSeverity.Info,
                Source = EventSource.System,
                Timestamp = now.AddMinutes(-i),
            })
            .ToList();

        DbContext.SystemEvents.AddRange(events);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Desabilita seqscan para que o otimizador avalie os índices disponíveis
        // independentemente da contagem de linhas reduzida no banco de teste.
        await DbContext.Database.ExecuteSqlRawAsync(
            "SET enable_seqscan = OFF;",
            TestContext.Current.CancellationToken
        );

        try
        {
            var fromTime = now.AddHours(-1);
            var toTime = now;

            var planLines = await DbContext
                .Database.SqlQuery<string>(
                    $"""
                    EXPLAIN
                    SELECT "Id", "Timestamp", "Title"
                    FROM "SystemEvents"
                    WHERE "UserId" = {user.Id}
                      AND "DeviceId" = {device.Id}
                      AND "Timestamp" >= {fromTime}
                      AND "Timestamp" <= {toTime}
                    ORDER BY "Timestamp" DESC
                    """
                )
                .ToListAsync(TestContext.Current.CancellationToken);

            var fullPlan = string.Join("\n", planLines);

            // Confirma que o PostgreSQL escolheu o novo índice composto (UserId, DeviceId, Timestamp DESC)
            fullPlan
                .Should()
                .Contain(
                    "IX_SystemEvents_UserId_DeviceId_Timestamp",
                    "o plano de execução deve usar o novo índice composto temporal."
                );

            // Confirma que NÃO há nó de Sort no plano de execução
            fullPlan
                .Should()
                .NotContain(
                    "Sort",
                    "o índice composto já fornece as linhas ordenadas por Timestamp DESC sem necessidade de Sort em memória."
                );
        }
        finally
        {
            await DbContext.Database.ExecuteSqlRawAsync(
                "SET enable_seqscan = ON;",
                TestContext.Current.CancellationToken
            );
        }
    }
}
