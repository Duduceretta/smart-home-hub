using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Auth.Commands.ForgotPassword;

namespace SmartHomeHub.UnitTests.Application.Features.Auth;

public class ForgotPasswordCommandHandlerTests
{
    private readonly IFirebaseAuthService _firebaseAuthService =
        Substitute.For<IFirebaseAuthService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly ILogger<ForgotPasswordCommandHandler> _logger = Substitute.For<
        ILogger<ForgotPasswordCommandHandler>
    >();
    private readonly ForgotPasswordCommandHandler _handler;

    public ForgotPasswordCommandHandlerTests()
    {
        _handler = new ForgotPasswordCommandHandler(_firebaseAuthService, _emailService, _logger);
    }

    [Fact]
    public async Task Handle_WhenUserExists_ShouldGenerateDirectActionUrlAndSendEmail()
    {
        // Arrange
        const string email = "usuario@nexushub.page";
        const string rawFirebaseLink =
            "https://smart-home-hub-eduardo.firebaseapp.com/__/auth/action?apiKey=AIzaFake&mode=resetPassword&oobCode=code-xyz-987&continueUrl=https://nexushub.page/reset-password";
        const string expectedActionUrl =
            "https://nexushub.page/reset-password?mode=resetPassword&oobCode=code-xyz-987";

        _firebaseAuthService
            .GeneratePasswordResetLinkAsync(
                email,
                "https://nexushub.page/reset-password",
                Arg.Any<CancellationToken>()
            )
            .Returns(rawFirebaseLink);

        var command = new ForgotPasswordCommand(email);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _emailService
            .Received(1)
            .SendPasswordResetEmailAsync(email, expectedActionUrl, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenUserDoesNotExist_ShouldReturnGenericSuccessWithoutSendingEmail()
    {
        // Arrange
        const string email = "inexistente@nexushub.page";

        _firebaseAuthService
            .GeneratePasswordResetLinkAsync(
                email,
                "https://nexushub.page/reset-password",
                Arg.Any<CancellationToken>()
            )
            .Returns((string?)null);

        var command = new ForgotPasswordCommand(email);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _emailService
            .DidNotReceive()
            .SendPasswordResetEmailAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task Handle_WhenLinkCannotBeParsed_ShouldFallbackToRawLink()
    {
        // Arrange
        const string email = "usuario@nexushub.page";
        const string fallbackLink = "https://auth.nexushub.page/reset-token";

        _firebaseAuthService
            .GeneratePasswordResetLinkAsync(
                email,
                "https://nexushub.page/reset-password",
                Arg.Any<CancellationToken>()
            )
            .Returns(fallbackLink);

        var command = new ForgotPasswordCommand(email);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _emailService
            .Received(1)
            .SendPasswordResetEmailAsync(email, fallbackLink, Arg.Any<CancellationToken>());
    }
}
