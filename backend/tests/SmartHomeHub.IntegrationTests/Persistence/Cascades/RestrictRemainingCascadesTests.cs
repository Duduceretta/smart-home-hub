using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Persistence.Cascades;

// Valida a segunda auditoria de banco de dados (migration RestrictRemainingCascades):
// 1. Automations.UserId -> Users.Id virou Restrict (simetria com Device/Room/DeviceGroup).
// 2. SystemEvents.UserId -> Users.Id virou Restrict (trilha de auditoria não sofre purge em cascata).
// 3. DeviceTelemetryLogs.DeviceId -> Devices.Id virou Restrict (dataset de ML protegido contra hard-delete de Device).
public class RestrictRemainingCascadesTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteUser_ViaRawSql_WithLinkedAutomation_ShouldBeBlockedByForeignKeyConstraint()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = $"uid-auto-{Guid.NewGuid():N}",
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Ligar Luz ao Entrar",
            RulePayload = "{}",
        };

        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        Func<Task> act = () =>
            DbContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"Users\" WHERE \"Id\" = {0}",
                [user.Id],
                TestContext.Current.CancellationToken
            );

        var exception = await act.Should().ThrowAsync<PostgresException>();
        exception
            .Which.SqlState.Should()
            .Be(
                "23503",
                "violação de foreign key (foreign_key_violation) — o DELETE físico direto em User deve ser bloqueado quando há Automations."
            );

        (await DbContext.Users.FindAsync([user.Id], TestContext.Current.CancellationToken))
            .Should()
            .NotBeNull("o Restrict deve impedir o DELETE de acontecer, o User continua existindo.");
    }

    [Fact]
    public async Task DeleteUser_ViaRawSql_WithLinkedSystemEvent_ShouldBeBlockedByForeignKeyConstraint()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = $"uid-evt-{Guid.NewGuid():N}",
        };

        var systemEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Timestamp = DateTimeOffset.UtcNow,
            EventType = "TestEvent",
            Title = "Evento de Teste",
            Description = "Descrição do evento para teste de integridade referencial",
            Severity = EventSeverity.Info,
            Source = EventSource.System,
        };

        DbContext.Users.Add(user);
        DbContext.SystemEvents.Add(systemEvent);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        Func<Task> act = () =>
            DbContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"Users\" WHERE \"Id\" = {0}",
                [user.Id],
                TestContext.Current.CancellationToken
            );

        var exception = await act.Should().ThrowAsync<PostgresException>();
        exception
            .Which.SqlState.Should()
            .Be(
                "23503",
                "violação de foreign key (foreign_key_violation) — o DELETE físico direto em User deve ser bloqueado quando há SystemEvents."
            );

        (await DbContext.Users.FindAsync([user.Id], TestContext.Current.CancellationToken))
            .Should()
            .NotBeNull("o Restrict deve impedir o DELETE de acontecer, o User continua existindo.");
    }

    [Fact]
    public async Task DeleteDevice_ViaRawSql_WithLinkedDeviceTelemetryLog_ShouldBeBlockedByForeignKeyConstraint()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = $"uid-dev-{Guid.NewGuid():N}",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Sensor Sala",
            Brand = "Sonoff",
            ExternalId = $"MAC-RESTRICT-{Guid.NewGuid():N}",
            Type = DeviceType.Sensor,
        };

        var telemetryLog = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = DateTimeOffset.UtcNow,
            IsOn = true,
            PowerUsageWatts = 45.5,
            TemperatureCelsius = 23.2,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        DbContext.DeviceTelemetryLogs.Add(telemetryLog);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        Func<Task> act = () =>
            DbContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"Devices\" WHERE \"Id\" = {0}",
                [device.Id],
                TestContext.Current.CancellationToken
            );

        var exception = await act.Should().ThrowAsync<PostgresException>();
        exception
            .Which.SqlState.Should()
            .Be(
                "23503",
                "violação de foreign key (foreign_key_violation) — o DELETE físico direto em Device deve ser bloqueado quando há telemetria histórica."
            );

        (await DbContext.Devices.FindAsync([device.Id], TestContext.Current.CancellationToken))
            .Should()
            .NotBeNull(
                "o Restrict deve impedir o DELETE de acontecer, o Device continua existindo."
            );
    }
}
