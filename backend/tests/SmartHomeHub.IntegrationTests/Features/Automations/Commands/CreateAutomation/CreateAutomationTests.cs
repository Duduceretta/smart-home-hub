using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Hangfire;
using Hangfire.Storage;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Commands.CreateAutomation;

public class CreateAutomationTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record CreateAutomationRequest(string Name, string RulePayload, bool IsActive);

    private const string PayloadWithoutTrigger = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private const string PayloadWithCronTrigger = """
        { "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 22 * * *" }], "conditions": null, "actions": [] }
        """;

    private const string PayloadWithInvalidCron = """
        { "triggers": [{ "type": "time", "id": "t1", "cronExpression": "isso não é cron" }], "conditions": null, "actions": [] }
        """;

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    private static bool RecurringJobExists(Guid automationId)
    {
        using var connection = (JobStorageConnection)JobStorage.Current.GetConnection();
        return connection
            .GetRecurringJobs()
            .Any(job => job.Id == $"automation_time_{automationId}");
    }

    [Fact]
    public async Task CreateAutomation_WithValidInput_ShouldPersistAndReturnCreated()
    {
        await SeedUserAsync();

        var request = new CreateAutomationRequest(
            "Desligar tudo à noite",
            PayloadWithoutTrigger,
            true
        );

        var response = await Client.PostAsJsonAsync(
            "/api/automations",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .FirstOrDefaultAsync(
                automation => automation.Name == request.Name,
                TestContext.Current.CancellationToken
            );

        physicalAutomation.Should().NotBeNull("A automação deveria ter sido salva no banco.");
        physicalAutomation.IsActive.Should().BeTrue();
        physicalAutomation.RulePayload.Should().Contain("triggers");
    }

    [Fact]
    public async Task CreateAutomation_WithNonExistentUser_ShouldReturnNotFound()
    {
        var request = new CreateAutomationRequest("Rotina Órfã", PayloadWithoutTrigger, true);

        var response = await Client.PostAsJsonAsync(
            "/api/automations",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var errorResponse = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        errorResponse.GetProperty("title").GetString().Should().Be("User.NotFound");
    }

    [Fact]
    public async Task CreateAutomation_WithEmptyName_ShouldReturnBadRequest()
    {
        await SeedUserAsync();

        var request = new CreateAutomationRequest("", PayloadWithoutTrigger, true);

        var response = await Client.PostAsJsonAsync(
            "/api/automations",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var automationCount = await DbContext.Automations.CountAsync(
            TestContext.Current.CancellationToken
        );
        automationCount.Should().Be(0, "Nenhuma automação poderia ter sido criada com nome vazio.");
    }

    [Fact]
    public async Task CreateAutomation_WithInvalidCronExpression_ShouldReturnBadRequest()
    {
        await SeedUserAsync();

        var request = new CreateAutomationRequest(
            "Rotina com cron quebrado",
            PayloadWithInvalidCron,
            true
        );

        var response = await Client.PostAsJsonAsync(
            "/api/automations",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var automationCount = await DbContext.Automations.CountAsync(
            TestContext.Current.CancellationToken
        );
        automationCount.Should().Be(0, "Um cron inválido não pode nem ser persistido.");
    }

    [Fact]
    public async Task CreateAutomation_ActiveWithCronTrigger_ShouldCreateRecurringJobInHangfire()
    {
        await SeedUserAsync();

        var request = new CreateAutomationRequest("Rotina Noturna", PayloadWithCronTrigger, true);

        var response = await Client.PostAsJsonAsync(
            "/api/automations",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .FirstAsync(
                automation => automation.Name == request.Name,
                TestContext.Current.CancellationToken
            );

        RecurringJobExists(physicalAutomation.Id)
            .Should()
            .BeTrue("uma automação ativa com TimeTrigger deve agendar um Recurring Job real.");
    }

    [Fact]
    public async Task CreateAutomation_InactiveWithCronTrigger_ShouldNotCreateRecurringJob()
    {
        await SeedUserAsync();

        var request = new CreateAutomationRequest(
            "Rotina Noturna Desativada",
            PayloadWithCronTrigger,
            false
        );

        var response = await Client.PostAsJsonAsync(
            "/api/automations",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .FirstAsync(
                automation => automation.Name == request.Name,
                TestContext.Current.CancellationToken
            );

        RecurringJobExists(physicalAutomation.Id)
            .Should()
            .BeFalse("uma automação inativa não pode ter um Recurring Job rodando no Hangfire.");
    }
}
