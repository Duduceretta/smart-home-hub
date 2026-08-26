using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Commands.CreateAutomation;
using SmartHomeHub.Application.Features.Automations.Commands.DeleteAutomation;
using SmartHomeHub.Application.Features.Automations.Commands.UpdateAutomation;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.UnitTests.Application.Features.Automations;

public class AutomationCommandHandlersTests
{
    private const string NoTriggerPayload = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private const string CronTriggerPayload = """
        { "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 22 * * *" }], "conditions": null, "actions": [] }
        """;

    private readonly AppDbContext _dbContext;
    private readonly IAutomationSchedulerService _schedulerService = Substitute.For<
        IAutomationSchedulerService
    >();

    public AutomationCommandHandlersTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _dbContext = new AppDbContext(options);
    }

    private async Task<User> SeedUserAsync()
    {
        var user = new User { Name = "Test User", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task Create_WhenUserDoesNotExist_ShouldFail()
    {
        var handler = new CreateAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new CreateAutomationCommand("Rotina", NoTriggerPayload, true, "unknown-uid"),
            CancellationToken.None
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("User.NotFound");
    }

    [Fact]
    public async Task Create_WithoutCronTrigger_ShouldNotScheduleAnything()
    {
        var user = await SeedUserAsync();
        var handler = new CreateAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new CreateAutomationCommand("Rotina", NoTriggerPayload, true, user.ExternalAuthUid),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
        _schedulerService.DidNotReceiveWithAnyArgs().ScheduleAutomation(default, default!);
    }

    [Fact]
    public async Task Create_ActiveWithCronTrigger_ShouldScheduleAutomation()
    {
        var user = await SeedUserAsync();
        var handler = new CreateAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new CreateAutomationCommand(
                "Rotina Noturna",
                CronTriggerPayload,
                true,
                user.ExternalAuthUid
            ),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
        _schedulerService.Received(1).ScheduleAutomation(result.Value, "0 22 * * *");
    }

    [Fact]
    public async Task Create_InactiveWithCronTrigger_ShouldNotScheduleAnything()
    {
        var user = await SeedUserAsync();
        var handler = new CreateAutomationCommandHandler(_dbContext, _schedulerService);

        await handler.Handle(
            new CreateAutomationCommand(
                "Rotina Noturna",
                CronTriggerPayload,
                false,
                user.ExternalAuthUid
            ),
            CancellationToken.None
        );

        _schedulerService.DidNotReceiveWithAnyArgs().ScheduleAutomation(default, default!);
    }

    [Fact]
    public async Task Update_WhenAutomationDoesNotBelongToUser_ShouldFail()
    {
        var owner = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = owner.Id,
            Name = "Rotina",
            RulePayload = NoTriggerPayload,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new UpdateAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new UpdateAutomationCommand(
                automation.Id,
                "Nova Rotina",
                NoTriggerPayload,
                true,
                otherUser.ExternalAuthUid
            ),
            CancellationToken.None
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Automation.NotFound");
    }

    [Fact]
    public async Task Update_ActiveWithCronTrigger_ShouldScheduleAutomation()
    {
        var user = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = user.Id,
            Name = "Rotina",
            RulePayload = NoTriggerPayload,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new UpdateAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new UpdateAutomationCommand(
                automation.Id,
                "Rotina Noturna",
                CronTriggerPayload,
                true,
                user.ExternalAuthUid
            ),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
        _schedulerService.Received(1).ScheduleAutomation(automation.Id, "0 22 * * *");
    }

    [Fact]
    public async Task Update_WhenDeactivated_ShouldUnscheduleAutomation()
    {
        var user = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = user.Id,
            Name = "Rotina",
            RulePayload = CronTriggerPayload,
            IsActive = true,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new UpdateAutomationCommandHandler(_dbContext, _schedulerService);

        await handler.Handle(
            new UpdateAutomationCommand(
                automation.Id,
                "Rotina Noturna",
                CronTriggerPayload,
                false,
                user.ExternalAuthUid
            ),
            CancellationToken.None
        );

        _schedulerService.Received(1).UnscheduleAutomation(automation.Id);
        _schedulerService.DidNotReceiveWithAnyArgs().ScheduleAutomation(default, default!);
    }

    [Fact]
    public async Task Delete_WhenOwnedByUser_ShouldSoftDeleteAndUnschedule()
    {
        var user = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = user.Id,
            Name = "Rotina",
            RulePayload = NoTriggerPayload,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new DeleteAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new DeleteAutomationCommand(automation.Id, user.ExternalAuthUid),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
        _schedulerService.Received(1).UnscheduleAutomation(automation.Id);

        var stillThereIgnoringFilters = await _dbContext
            .Automations.IgnoreQueryFilters()
            .FirstAsync(a => a.Id == automation.Id);
        stillThereIgnoringFilters.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task Delete_WhenAutomationDoesNotExist_ShouldFail()
    {
        var user = await SeedUserAsync();
        var handler = new DeleteAutomationCommandHandler(_dbContext, _schedulerService);

        var result = await handler.Handle(
            new DeleteAutomationCommand(Guid.NewGuid(), user.ExternalAuthUid),
            CancellationToken.None
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Automation.NotFound");
        _schedulerService.DidNotReceiveWithAnyArgs().UnscheduleAutomation(default);
    }
}
