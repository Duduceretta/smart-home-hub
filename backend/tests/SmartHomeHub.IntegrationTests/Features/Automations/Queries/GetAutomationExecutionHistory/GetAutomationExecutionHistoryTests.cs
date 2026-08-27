using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Queries.GetAutomationExecutionHistory;

public class GetAutomationExecutionHistoryTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private const string Payload = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private record ActivityLogEntryResponse(
        Guid Id,
        Guid? DeviceId,
        string EventType,
        string Title,
        string Description,
        DateTimeOffset Timestamp,
        bool IsAlert
    );

    public record PagedResponse<T>(
        List<T> Items,
        int Page,
        int PageSize,
        int TotalCount,
        int TotalPages,
        bool HasNextPage,
        bool HasPreviousPage
    );

    [Fact]
    public async Task GetAutomationExecutionHistory_ShouldReturnOnlyEventsForThatAutomation_NewestFirst()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var targetAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Desligar tudo à noite",
            RulePayload = Payload,
        };
        var otherAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Outra Automação",
            RulePayload = Payload,
        };

        var now = DateTimeOffset.UtcNow;

        var olderSuccess = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = targetAutomation.Id,
            EventType = "AutomationExecuted",
            Title = "Desligar tudo à noite disparou",
            Description = "Ação executada em Tomada da Sala.",
            Timestamp = now.AddMinutes(-10),
            IsAlert = false,
        };
        var newerFailure = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = targetAutomation.Id,
            EventType = "AutomationExecuted",
            Title = "Desligar tudo à noite falhou",
            Description = "Falha ao acionar Tomada da Sala: dispositivo offline.",
            Timestamp = now,
            IsAlert = true,
        };
        var otherAutomationEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            AutomationId = otherAutomation.Id,
            EventType = "AutomationExecuted",
            Title = "Não deve aparecer",
            Description = "Pertence a outra automação.",
            Timestamp = now,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Automations.AddRange(targetAutomation, otherAutomation);
        DbContext.SystemEvents.AddRange(olderSuccess, newerFailure, otherAutomationEvent);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/automations/{targetAutomation.Id}/history",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<ActivityLogEntryResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        pagedResult!.Items.Should().HaveCount(2);
        pagedResult
            .Items.Select(entry => entry.Title)
            .Should()
            .ContainInOrder("Desligar tudo à noite falhou", "Desligar tudo à noite disparou");
        pagedResult.Items[0].IsAlert.Should().BeTrue();
        pagedResult.Items[1].IsAlert.Should().BeFalse();
    }
}
