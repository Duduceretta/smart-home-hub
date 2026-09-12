using FluentAssertions;
using SmartHomeHub.Application.Features.Auth.Commands.SendVerificationEmail;

namespace SmartHomeHub.UnitTests.Application.Features.Auth;

public class SendVerificationEmailCommandValidatorTests
{
    private readonly SendVerificationEmailCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidEmail_ShouldNotHaveErrors()
    {
        // Arrange
        var command = new SendVerificationEmailCommand("user@nexushub.page");

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
        var command = new SendVerificationEmailCommand(email!);

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SendVerificationEmailCommand.Email));
    }

    [Theory]
    [InlineData("notanemail")]
    [InlineData("invalid@")]
    [InlineData("@nodomain.com")]
    public void Validate_WithInvalidEmailFormat_ShouldHaveValidationError(string email)
    {
        // Arrange
        var command = new SendVerificationEmailCommand(email);

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SendVerificationEmailCommand.Email));
    }
}
