using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Queries.GetAutomationById;

public class GetAutomationByIdTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private const string Payload = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private record AutomationResponse(Guid Id, string Name, bool IsActive, string RulePayload);

    [Fact]
    public async Task GetAutomationById_WithValidIdAndOwner_ShouldReturnOkAndData()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };
        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Rotina Noturna",
            RulePayload = Payload,
            IsActive = false,
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/automations/{automation.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var automationResponse = await response.Content.ReadFromJsonAsync<AutomationResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        automationResponse.Should().NotBeNull();
        automationResponse!.Id.Should().Be(automation.Id);
        automationResponse.Name.Should().Be("Rotina Noturna");
        automationResponse.IsActive.Should().BeFalse();
        automationResponse.RulePayload.Should().Contain("triggers");
    }

    [Fact]
    public async Task GetAutomationById_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Invasor",
            ExternalAuthUid = "firebase-token-123",
        };
        var victim = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vítima",
            ExternalAuthUid = "token-da-vitima",
        };
        var victimAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = victim.Id,
            Name = "Rotina Particular",
            RulePayload = Payload,
        };
        DbContext.Users.AddRange(loggedUser, victim);
        DbContext.Automations.Add(victimAutomation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/automations/{victimAutomation.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAutomationById_WhenDoesNotExist_ShouldReturnNotFound()
    {
        var response = await Client.GetAsync(
            $"/api/automations/{Guid.NewGuid()}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
