using FluentAssertions;
using SmartHomeHub.Application.Features.Users.Commands.SyncUser;

namespace SmartHomeHub.UnitTests.Application.Features.Users;

public class SyncUserCommandValidatorTests
{
    private readonly SyncUserCommandValidator _validator = new();

    [Fact]
    public void Validate_WhenFirebaseUidIsProvided_ShouldBeValid()
    {
        var command = new SyncUserCommand("firebase-uid-valid", "test@nexushub.page");
        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Validate_WhenFirebaseUidIsEmpty_ShouldFailValidation(string? uid)
    {
        var command = new SyncUserCommand(uid!, "test@nexushub.page");
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result
            .Errors.Should()
            .Contain(e => e.ErrorMessage == "O identificador do usuário é obrigatório.");
    }
}
