using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Hangfire;
using Hangfire.Storage;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Commands.UpdateAutomation;

public class UpdateAutomationTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record UpdateAutomationRequest(string Name, string RulePayload, bool IsActive);

    private const string PayloadWithoutTrigger = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private const string PayloadWithCronTrigger = """
        { "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 22 * * *" }], "conditions": null, "actions": [] }
        """;

    private static bool RecurringJobExists(Guid automationId)
    {
        using var connection = (JobStorageConnection)JobStorage.Current.GetConnection();
        return connection
            .GetRecurringJobs()
            .Any(job => job.Id == $"automation_time_{automationId}");
    }

    [Fact]
    public async Task UpdateAutomation_WithValidData_ShouldUpdateAndReturnOk()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
            IsDeleted = false,
        };
        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Nome Antigo",
            RulePayload = PayloadWithoutTrigger,
            IsActive = true,
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateAutomationRequest("Nome Novo", PayloadWithoutTrigger, true);

        var response = await Client.PutAsJsonAsync(
            $"/api/automations/{automation.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .FirstAsync(a => a.Id == automation.Id, TestContext.Current.CancellationToken);

        physicalAutomation.Name.Should().Be("Nome Novo");
        physicalAutomation.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAutomation_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Invasor",
            Email = "hacker@smarthome.com",
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
            Name = "Rotina da Vítima",
            RulePayload = PayloadWithoutTrigger,
        };
        DbContext.Users.AddRange(loggedUser, victim);
        DbContext.Automations.Add(victimAutomation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var request = new UpdateAutomationRequest("Hacked", PayloadWithoutTrigger, true);

        var response = await Client.PutAsJsonAsync(
            $"/api/automations/{victimAutomation.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .FirstAsync(a => a.Id == victimAutomation.Id, TestContext.Current.CancellationToken);
        physicalAutomation.Name.Should().Be("Rotina da Vítima");
    }

    [Fact]
    public async Task UpdateAutomation_WithMissingName_ShouldReturnBadRequest()
    {
        var request = new UpdateAutomationRequest("", PayloadWithoutTrigger, true);

        var response = await Client.PutAsJsonAsync(
            $"/api/automations/{Guid.NewGuid()}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateAutomation_AddingCronTriggerWhileActive_ShouldCreateRecurringJob()
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
            Name = "Rotina",
            RulePayload = PayloadWithoutTrigger,
            IsActive = true,
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        RecurringJobExists(automation.Id).Should().BeFalse();

        var request = new UpdateAutomationRequest("Rotina Noturna", PayloadWithCronTrigger, true);

        var response = await Client.PutAsJsonAsync(
            $"/api/automations/{automation.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        RecurringJobExists(automation.Id)
            .Should()
            .BeTrue("adicionar um TimeTrigger a uma automação ativa deve criar o Recurring Job.");
    }

    [Fact]
    public async Task UpdateAutomation_Deactivating_ShouldRemoveExistingRecurringJob()
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
            RulePayload = PayloadWithCronTrigger,
            IsActive = true,
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Simula o agendamento original que o Create teria feito.
        RecurringJob.AddOrUpdate<SmartHomeHub.Application.Common.Interfaces.IAutomationTimeTriggerJob>(
            $"automation_time_{automation.Id}",
            job => job.ExecuteAsync(automation.Id),
            "0 22 * * *"
        );
        RecurringJobExists(automation.Id).Should().BeTrue();

        var request = new UpdateAutomationRequest("Rotina Noturna", PayloadWithCronTrigger, false);

        var response = await Client.PutAsJsonAsync(
            $"/api/automations/{automation.Id}",
            request,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        RecurringJobExists(automation.Id)
            .Should()
            .BeFalse("desativar a automação deve remover o Recurring Job órfão do Hangfire.");
    }
}
