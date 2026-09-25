using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Queries.GetNextScheduledAutomation;

public class GetNextScheduledAutomationTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private const string PayloadWithoutTrigger = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    // Janeiro 1 e 2 de propósito, não "amanhã às Xh": o ambiente de teste roda
    // em setembro de 2026 (ver system reminder de data do projeto), bem longe
    // de virada de ano — garante ordenação estável entre as duas automações
    // sem depender da hora exata em que o teste roda.
    private const string PayloadCronJan1 = """
        { "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 0 1 1 *" }], "conditions": null, "actions": [] }
        """;

    private const string PayloadCronJan2 = """
        { "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 0 2 1 *" }], "conditions": null, "actions": [] }
        """;

    private record CreateAutomationRequest(string Name, string RulePayload, bool IsActive);

    private record NextScheduledAutomationResponse(
        Guid AutomationId,
        string Name,
        DateTimeOffset NextRunUtc
    );

    private async Task<User> SeedUserAsync(string externalAuthUid, string name)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = name,
            Email = $"{externalAuthUid}@smarthome.com",
            ExternalAuthUid = externalAuthUid,
            IsDeleted = false,
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [Fact]
    public async Task GetNextScheduledAutomation_NoScheduleAutomations_ShouldReturnNull()
    {
        await SeedUserAsync("firebase-token-123", "Eduardo Ceretta");

        var response = await Client.GetAsync(
            "/api/automations/next-scheduled",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body.Trim().Should().Be("null");
    }

    [Fact]
    public async Task GetNextScheduledAutomation_SensorTriggerAutomation_ShouldBeIgnored()
    {
        await SeedUserAsync("firebase-token-123", "Eduardo Ceretta");

        await Client.PostAsJsonAsync(
            "/api/automations",
            new CreateAutomationRequest("Sensor de Movimento", PayloadWithoutTrigger, true),
            TestContext.Current.CancellationToken
        );

        var response = await Client.GetAsync(
            "/api/automations/next-scheduled",
            TestContext.Current.CancellationToken
        );

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body.Trim().Should().Be("null", "automação sem TimeTrigger não tem Recurring Job pra ler.");
    }

    [Fact]
    public async Task GetNextScheduledAutomation_MultipleActiveSchedules_ShouldReturnTheSoonestOne()
    {
        await SeedUserAsync("firebase-token-123", "Eduardo Ceretta");

        await Client.PostAsJsonAsync(
            "/api/automations",
            new CreateAutomationRequest("Rotina de Ano Novo", PayloadCronJan1, true),
            TestContext.Current.CancellationToken
        );
        await Client.PostAsJsonAsync(
            "/api/automations",
            new CreateAutomationRequest("Rotina do Dia Seguinte", PayloadCronJan2, true),
            TestContext.Current.CancellationToken
        );

        var response = await Client.GetAsync(
            "/api/automations/next-scheduled",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<NextScheduledAutomationResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.Name.Should().Be("Rotina de Ano Novo", "1º de janeiro vem antes de 2 de janeiro.");
    }

    [Fact]
    public async Task GetNextScheduledAutomation_OtherUsersSchedule_ShouldNeverLeak()
    {
        await SeedUserAsync("firebase-token-123", "Eduardo Ceretta");
        await SeedUserAsync("vizinho-token", "Vizinho");

        // Cria a automação do vizinho diretamente no banco (sem passar pelo
        // Client autenticado como o usuário principal) e agenda manualmente
        // no Hangfire, do mesmo jeito que o CreateAutomationCommandHandler faria.
        var neighborUser = await DbContext.Users.FirstAsync(
            u => u.ExternalAuthUid == "vizinho-token",
            TestContext.Current.CancellationToken
        );
        var neighborAutomation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = neighborUser.Id,
            Name = "Rotina do Vizinho",
            RulePayload = PayloadCronJan1,
            IsActive = true,
        };
        DbContext.Automations.Add(neighborAutomation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        RecurringJob.AddOrUpdate(
            $"automation_time_{neighborAutomation.Id}",
            () => Console.WriteLine("noop"),
            "0 0 1 1 *"
        );

        var response = await Client.GetAsync(
            "/api/automations/next-scheduled",
            TestContext.Current.CancellationToken
        );

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body.Trim()
            .Should()
            .Be("null", "a rotina agendada de outro usuário nunca pode aparecer pro usuário logado.");
    }

    [Fact]
    public async Task GetNextScheduledAutomation_OrphanRecurringJobWithoutMatchingAutomationRow_ShouldBeIgnored()
    {
        await SeedUserAsync("firebase-token-123", "Eduardo Ceretta");

        // Simula um Recurring Job que sobrou no Hangfire de uma automação já
        // deletada/nunca existente (não deveria travar nem ser retornado).
        var orphanId = Guid.NewGuid();
        RecurringJob.AddOrUpdate(
            $"automation_time_{orphanId}",
            () => Console.WriteLine("noop"),
            "0 0 1 1 *"
        );

        var response = await Client.GetAsync(
            "/api/automations/next-scheduled",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body.Trim().Should().Be("null");
    }
}
