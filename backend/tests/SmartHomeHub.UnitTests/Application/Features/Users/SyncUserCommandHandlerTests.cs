using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Features.Users.Commands.SyncUser;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.UnitTests.Application.Features.Users;

public class SyncUserCommandHandlerTests
{
    private static DbContextOptions<AppDbContext> CreateNewOptions()
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task Handle_WhenUserAlreadyExists_ShouldReturnExistingUserIdWithWasCreatedFalse()
    {
        // Arrange
        var options = CreateNewOptions();
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            ExternalAuthUid = "firebase-existing-123",
            Email = "existente@nexushub.page",
            Name = "Usuário do Hub",
        };

        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Users.Add(existingUser);
            await seedContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using var dbContext = new AppDbContext(options);
        var handler = new SyncUserCommandHandler(dbContext);
        var command = new SyncUserCommand(existingUser.ExternalAuthUid, existingUser.Email);

        // Act
        var result = await handler.Handle(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.UserId.Should().Be(existingUser.Id);
        result.Value.WasCreated.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenUserDoesNotExist_ShouldCreateUserAndReturnWasCreatedTrue()
    {
        // Arrange
        var options = CreateNewOptions();
        await using var dbContext = new AppDbContext(options);
        var handler = new SyncUserCommandHandler(dbContext);
        var command = new SyncUserCommand("firebase-new-456", "novo@nexushub.page");

        // Act
        var result = await handler.Handle(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.WasCreated.Should().BeTrue();

        var createdUser = await dbContext.Users.FirstOrDefaultAsync(
            u => u.ExternalAuthUid == "firebase-new-456",
            TestContext.Current.CancellationToken
        );
        createdUser.Should().NotBeNull();
        createdUser!.Email.Should().Be("novo@nexushub.page");
        createdUser.Name.Should().Be("Usuário do Hub");
        result.Value.UserId.Should().Be(createdUser.Id);
    }

    [Fact]
    public async Task Handle_WhenConcurrentInsertCausesDbUpdateExceptionAndRaceWinnerExists_ShouldReturnRaceWinner()
    {
        // Arrange
        var options = CreateNewOptions();
        var raceWinner = new User
        {
            Id = Guid.NewGuid(),
            ExternalAuthUid = "firebase-race-789",
            Email = "concorrente@nexushub.page",
            Name = "Usuário do Hub",
        };

        // Simula uma falha no SaveChangesAsync em decorrência de inserção concorrente
        await using var dbContext = new ConcurrencyThrowingDbContext(
            options,
            () =>
            {
                using var otherContext = new AppDbContext(options);
                otherContext.Users.Add(raceWinner);
                otherContext.SaveChanges();
            }
        );

        var handler = new SyncUserCommandHandler(dbContext);
        var command = new SyncUserCommand(raceWinner.ExternalAuthUid, raceWinner.Email);

        // Act
        var result = await handler.Handle(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.UserId.Should().Be(raceWinner.Id);
        result.Value.WasCreated.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenDbUpdateExceptionOccursAndUserNotFound_ShouldRethrowDbUpdateException()
    {
        // Arrange
        var options = CreateNewOptions();
        await using var dbContext = new ConcurrencyThrowingDbContext(options, () => { });
        var handler = new SyncUserCommandHandler(dbContext);
        var command = new SyncUserCommand("firebase-err-000", "erro@nexushub.page");

        // Act
        var act = () => handler.Handle(command, TestContext.Current.CancellationToken).AsTask();

        // Assert
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    private class ConcurrencyThrowingDbContext(
        DbContextOptions<AppDbContext> options,
        Action onSaveBeforeThrow
    ) : AppDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            onSaveBeforeThrow();
            throw new DbUpdateException("Simulated unique constraint collision", (Exception?)null);
        }
    }
}
