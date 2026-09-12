using FluentAssertions;
using SmartHomeHub.Application.Features.Auth.Commands.ForgotPassword;

namespace SmartHomeHub.UnitTests.Application.Features.Auth;

public class ForgotPasswordCommandValidatorTests
{
    private readonly ForgotPasswordCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidEmail_ShouldNotHaveErrors()
    {
        // Arrange
        var command = new ForgotPasswordCommand("user@nexushub.page");

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Validate_WithEmptyEmail_ShouldHaveValidationError(string? email)
    {
        // Arrange
        var command = new ForgotPasswordCommand(email!);

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(ForgotPasswordCommand.Email));
    }

    [Theory]
    [InlineData("notanemail")]
    [InlineData("invalid@")]
    [InlineData("@nodomain.com")]
    public void Validate_WithInvalidEmailFormat_ShouldHaveValidationError(string email)
    {
        // Arrange
        var command = new ForgotPasswordCommand(email);

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(ForgotPasswordCommand.Email));
    }
}
