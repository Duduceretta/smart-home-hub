using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Features.Automations.Queries.GetAutomationById;
using SmartHomeHub.Application.Features.Automations.Queries.GetAutomations;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.UnitTests.Application.Features.Automations;

public class AutomationQueryHandlersTests
{
    private const string Payload = """
        { "triggers": [], "conditions": null, "actions": [] }
        """;

    private readonly AppDbContext _dbContext;

    public AutomationQueryHandlersTests()
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
    public async Task GetAutomations_ShouldOnlyReturnAutomationsOwnedByUser()
    {
        var owner = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        _dbContext.Automations.AddRange(
            new Automation { UserId = owner.Id, Name = "Rotina do Owner", RulePayload = Payload },
            new Automation
            {
                UserId = otherUser.Id,
                Name = "Rotina de Outro",
                RulePayload = Payload,
            }
        );
        await _dbContext.SaveChangesAsync();

        var handler = new GetAutomationsQueryHandler(_dbContext);
        var result = await handler.Handle(
            new GetAutomationsQuery(owner.ExternalAuthUid),
            CancellationToken.None
        );

        result.Items.Should().ContainSingle(a => a.Name == "Rotina do Owner");
    }

    [Fact]
    public async Task GetAutomations_ShouldNotReturnSoftDeletedAutomations()
    {
        var owner = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = owner.Id,
            Name = "Rotina Excluída",
            RulePayload = Payload,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();
        _dbContext.Automations.Remove(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new GetAutomationsQueryHandler(_dbContext);
        var result = await handler.Handle(
            new GetAutomationsQuery(owner.ExternalAuthUid),
            CancellationToken.None
        );

        result.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAutomationById_WhenOwnedByAnotherUser_ShouldReturnNull()
    {
        var owner = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = owner.Id,
            Name = "Rotina",
            RulePayload = Payload,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new GetAutomationByIdQueryHandler(_dbContext);
        var result = await handler.Handle(
            new GetAutomationByIdQuery(automation.Id, otherUser.ExternalAuthUid),
            CancellationToken.None
        );

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAutomationById_WhenOwnedByUser_ShouldReturnDto()
    {
        var owner = await SeedUserAsync();
        var automation = new Automation
        {
            UserId = owner.Id,
            Name = "Rotina Noturna",
            RulePayload = Payload,
            IsActive = false,
        };
        _dbContext.Automations.Add(automation);
        await _dbContext.SaveChangesAsync();

        var handler = new GetAutomationByIdQueryHandler(_dbContext);
        var result = await handler.Handle(
            new GetAutomationByIdQuery(automation.Id, owner.ExternalAuthUid),
            CancellationToken.None
        );

        result.Should().NotBeNull();
        result!.Name.Should().Be("Rotina Noturna");
        result.IsActive.Should().BeFalse();
    }
}
