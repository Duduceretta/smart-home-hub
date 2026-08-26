using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Queries.GetAutomations;

public class GetAutomationsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private const string Payload = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private record AutomationResponse(Guid Id, string Name, bool IsActive);

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
    public async Task GetAutomations_ShouldReturnOnlyAutomations_OwnedByTheLoggedUser()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };
        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            ExternalAuthUid = "vizinho-token",
        };

        var mine1 = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Minha Rotina 1",
            RulePayload = Payload,
        };
        var mine2 = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Minha Rotina 2",
            RulePayload = Payload,
        };
        var otherAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            Name = "Rotina do Vizinho",
            RulePayload = Payload,
        };
        var deletedAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Rotina Deletada",
            RulePayload = Payload,
            IsDeleted = true,
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.Automations.AddRange(mine1, mine2, otherAutomation, deletedAutomation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<AutomationResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        var returnedIds = pagedResult!.Items.Select(automation => automation.Id).ToList();
        returnedIds.Should().Contain(mine1.Id);
        returnedIds.Should().Contain(mine2.Id);
        returnedIds.Should().NotContain(otherAutomation.Id);
        returnedIds.Should().NotContain(deletedAutomation.Id);
    }

    [Fact]
    public async Task GetAutomations_WithPaginationParams_ShouldReturnCorrectPageAndMetadata()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var automations = new List<Automation>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "A_Rotina",
                RulePayload = Payload,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "B_Rotina",
                RulePayload = Payload,
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                Name = "C_Rotina",
                RulePayload = Payload,
            },
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Automations.AddRange(automations);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/automations?page=2&pageSize=2",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pagedResult = await response.Content.ReadFromJsonAsync<
            PagedResponse<AutomationResponse>
        >(cancellationToken: TestContext.Current.CancellationToken);

        pagedResult.Should().NotBeNull();
        pagedResult!.Page.Should().Be(2);
        pagedResult.PageSize.Should().Be(2);
        pagedResult.TotalCount.Should().Be(3);
        pagedResult.Items.Should().ContainSingle();
        pagedResult.Items[0].Name.Should().Be("C_Rotina");
    }
}
