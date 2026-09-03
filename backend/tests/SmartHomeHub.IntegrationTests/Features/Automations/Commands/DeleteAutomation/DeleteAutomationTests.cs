using System.Net;
using FluentAssertions;
using Hangfire;
using Hangfire.Storage;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Automations.Commands.DeleteAutomation;

public class DeleteAutomationTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
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
    public async Task DeleteAutomation_ShouldSoftDelete_AndHideFromCommonQueries()
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
            Name = "Rotina a Excluir",
            RulePayload = PayloadWithCronTrigger,
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var deleteResponse = await Client.DeleteAsync(
            $"/api/automations/{automation.Id}",
            TestContext.Current.CancellationToken
        );

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await Client.GetAsync(
            $"/api/automations/{automation.Id}",
            TestContext.Current.CancellationToken
        );
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .IgnoreQueryFilters()
            .FirstAsync(a => a.Id == automation.Id, TestContext.Current.CancellationToken);

        physicalAutomation
            .Should()
            .NotBeNull("o registro não pode ser apagado fisicamente do banco.");
        physicalAutomation.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAutomation_WithCronTrigger_ShouldRemoveRecurringJob()
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
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        RecurringJob.AddOrUpdate<SmartHomeHub.Application.Common.Interfaces.IAutomationTimeTriggerJob>(
            $"automation_time_{automation.Id}",
            job => job.ExecuteAsync(automation.Id),
            "0 22 * * *"
        );
        RecurringJobExists(automation.Id).Should().BeTrue();

        var response = await Client.DeleteAsync(
            $"/api/automations/{automation.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        RecurringJobExists(automation.Id)
            .Should()
            .BeFalse("excluir a automação deve remover o Recurring Job do Hangfire.");
    }

    [Fact]
    public async Task DeleteAutomation_OwnedByAnotherUser_ShouldReturnNotFound()
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
            Name = "Rotina da Vítima",
            RulePayload = PayloadWithCronTrigger,
        };
        DbContext.Users.AddRange(loggedUser, victim);
        DbContext.Automations.Add(victimAutomation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/automations/{victimAutomation.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var physicalAutomation = await DbContext
            .Automations.AsNoTracking()
            .FirstAsync(a => a.Id == victimAutomation.Id, TestContext.Current.CancellationToken);
        physicalAutomation
            .IsDeleted.Should()
            .BeFalse("outro usuário não pode excluir a automação.");
    }

    [Fact]
    public async Task DeleteAutomation_WhenAlreadyDeleted_ShouldReturnNotFound()
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
            Name = "Rotina Antiga",
            RulePayload = PayloadWithCronTrigger,
            IsDeleted = true,
        };
        DbContext.Users.Add(user);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            $"/api/automations/{automation.Id}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
