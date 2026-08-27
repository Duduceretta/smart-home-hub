using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
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
}
