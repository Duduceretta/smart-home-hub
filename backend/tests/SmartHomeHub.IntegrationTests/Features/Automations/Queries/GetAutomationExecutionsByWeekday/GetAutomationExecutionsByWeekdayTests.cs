using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Queries.GetAutomationExecutionsByWeekday;

public class GetAutomationExecutionsByWeekdayTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private const string Payload = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private record WeekdayCountResponse(DayOfWeek DayOfWeek, int Count);

    [Fact]
    public async Task GetAutomationExecutionsByWeekday_ShouldReturnAllSevenDays_ZeroFillingDaysWithoutExecutions()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Ligar luzes",
            RulePayload = Payload,
        };

        // Ancora numa quarta-feira conhecida (2026-08-26) pra não depender do
        // dia da semana em que o teste roda.
        var wednesday = new DateTimeOffset(2026, 8, 26, 10, 0, 0, TimeSpan.Zero);

        var events = new List<SystemEvent>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                AutomationId = automation.Id,
                EventType = "AutomationExecuted",
                Title = "Ligar luzes disparou",
                Description = "x",
                Timestamp = wednesday,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                AutomationId = automation.Id,
                EventType = "AutomationExecuted",
                Title = "Ligar luzes disparou",
                Description = "x",
                Timestamp = wednesday.AddDays(7),
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                AutomationId = automation.Id,
                EventType = "AutomationExecuted",
                Title = "Ligar luzes disparou",
                Description = "x",
                Timestamp = wednesday.AddDays(2), // sexta-feira
            },
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Automations.Add(automation);
        DbContext.SystemEvents.AddRange(events);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/automations/{automation.Id}/executions/by-weekday?days=3650",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var counts = await response.Content.ReadFromJsonAsync<List<WeekdayCountResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        counts.Should().NotBeNull();
        counts!.Should().HaveCount(7, "todos os 7 dias devem aparecer, mesmo zerados");
        counts.Single(c => c.DayOfWeek == DayOfWeek.Wednesday).Count.Should().Be(2);
        counts.Single(c => c.DayOfWeek == DayOfWeek.Friday).Count.Should().Be(1);
        counts.Single(c => c.DayOfWeek == DayOfWeek.Monday).Count.Should().Be(0);
    }

    [Fact]
    public async Task GetAutomationExecutionsByWeekday_AutomationWithMultipleActions_ShouldCountOneExecutionPerTraceId()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Boa noite",
            RulePayload = Payload,
        };

        var wednesday = new DateTimeOffset(2026, 8, 26, 22, 0, 0, TimeSpan.Zero);
        var traceId = Guid.NewGuid().ToString("N");

        // Um único disparo (mesmo TraceId) com 2 ações — uma por dispositivo —
        // é exatamente o que AutomationDispatchHelper gera: um SystemEvent por
        // ação despachada, todas com o mesmo TraceId do disparo.
        var actionOne = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = automation.Id,
            EventType = "AutomationExecuted",
            TraceId = traceId,
            Title = "Boa noite disparou",
            Description = "Ação executada em Luz da Sala.",
            Timestamp = wednesday,
            Severity = EventSeverity.Info,
        };
        var actionTwo = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = automation.Id,
            EventType = "AutomationExecuted",
            TraceId = traceId,
            Title = "Boa noite disparou",
            Description = "Ação executada em Tomada do Quarto.",
            Timestamp = wednesday.AddSeconds(1),
            Severity = EventSeverity.Info,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Automations.Add(automation);
        DbContext.SystemEvents.AddRange(actionOne, actionTwo);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/automations/{automation.Id}/executions/by-weekday?days=3650",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var counts = await response.Content.ReadFromJsonAsync<List<WeekdayCountResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        counts.Should().NotBeNull();
        counts!
            .Single(c => c.DayOfWeek == DayOfWeek.Wednesday)
            .Count.Should()
            .Be(1, "2 ações do mesmo disparo (mesmo TraceId) contam como 1 execução");

        // Auditoria detalhada não pode sumir: as 2 linhas continuam gravadas,
        // uma por ação, com o mesmo TraceId e timestamps próximos.
        var persistedEvents = await DbContext
            .SystemEvents.IgnoreQueryFilters()
            .Where(e => e.AutomationId == automation.Id)
            .ToListAsync(TestContext.Current.CancellationToken);

        persistedEvents.Should().HaveCount(2);
        persistedEvents.Should().OnlyContain(e => e.TraceId == traceId);
        (persistedEvents[1].Timestamp - persistedEvents[0].Timestamp)
            .Should()
            .BeLessThan(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task GetAutomationExecutionsByWeekday_OneActionFailsAndOtherSucceedsSameTraceId_ShouldStillCountOneExecution()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Sair de casa",
            RulePayload = Payload,
        };

        var wednesday = new DateTimeOffset(2026, 8, 26, 8, 0, 0, TimeSpan.Zero);
        var traceId = Guid.NewGuid().ToString("N");

        var succeededAction = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = automation.Id,
            EventType = "AutomationExecuted",
            TraceId = traceId,
            Title = "Sair de casa disparou",
            Description = "Ação executada em Fechadura.",
            Timestamp = wednesday,
            Severity = EventSeverity.Info,
            IsAlert = false,
        };
        var failedAction = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = automation.Id,
            EventType = "AutomationExecuted",
            TraceId = traceId,
            Title = "Sair de casa falhou",
            Description = "Falha ao acionar Câmera: dispositivo offline.",
            Timestamp = wednesday.AddSeconds(1),
            Severity = EventSeverity.Error,
            IsAlert = true,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Automations.Add(automation);
        DbContext.SystemEvents.AddRange(succeededAction, failedAction);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/automations/{automation.Id}/executions/by-weekday?days=3650",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var counts = await response.Content.ReadFromJsonAsync<List<WeekdayCountResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        counts!
            .Single(c => c.DayOfWeek == DayOfWeek.Wednesday)
            .Count.Should()
            .Be(1, "falha parcial dentro do mesmo disparo ainda é 1 execução");

        var persistedEvents = await DbContext
            .SystemEvents.IgnoreQueryFilters()
            .Where(e => e.AutomationId == automation.Id)
            .OrderBy(e => e.Timestamp)
            .ToListAsync(TestContext.Current.CancellationToken);

        persistedEvents.Should().HaveCount(2);
        persistedEvents[0].Severity.Should().Be(EventSeverity.Info);
        persistedEvents[0].IsAlert.Should().BeFalse();
        persistedEvents[1].Severity.Should().Be(EventSeverity.Error);
        persistedEvents[1].IsAlert.Should().BeTrue();
    }
}
