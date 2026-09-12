using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Auth.Commands.SendVerificationEmail;

namespace SmartHomeHub.UnitTests.Application.Features.Auth;

public class SendVerificationEmailCommandHandlerTests
{
    private readonly IFirebaseAuthService _firebaseAuthService =
        Substitute.For<IFirebaseAuthService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly ILogger<SendVerificationEmailCommandHandler> _logger = Substitute.For<
        ILogger<SendVerificationEmailCommandHandler>
    >();
    private readonly SendVerificationEmailCommandHandler _handler;

    public SendVerificationEmailCommandHandlerTests()
    {
        _handler = new SendVerificationEmailCommandHandler(
            _firebaseAuthService,
            _emailService,
            _logger
        );
    }

    [Fact]
    public async Task Handle_WhenUserExists_ShouldGenerateDirectActionUrlAndSendVerificationEmail()
    {
        // Arrange
        const string email = "usuario@nexushub.page";
        const string rawFirebaseLink =
            "https://smart-home-hub-eduardo.firebaseapp.com/__/auth/action?apiKey=AIzaFake&mode=verifyEmail&oobCode=code-verify-123&continueUrl=https://nexushub.page/verify-email";
        const string expectedActionUrl =
            "https://nexushub.page/verify-email?mode=verifyEmail&oobCode=code-verify-123";

        _firebaseAuthService
            .GenerateEmailVerificationLinkAsync(
                email,
                "https://nexushub.page/verify-email",
                Arg.Any<CancellationToken>()
            )
            .Returns(rawFirebaseLink);

        var command = new SendVerificationEmailCommand(email);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _emailService
            .Received(1)
            .SendEmailVerificationEmailAsync(
                email,
                expectedActionUrl,
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task Handle_WhenUserDoesNotExist_ShouldReturnGenericSuccessWithoutSendingEmail()
    {
        // Arrange
        const string email = "inexistente@nexushub.page";

        _firebaseAuthService
            .GenerateEmailVerificationLinkAsync(
                email,
                "https://nexushub.page/verify-email",
                Arg.Any<CancellationToken>()
            )
            .Returns((string?)null);

        var command = new SendVerificationEmailCommand(email);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _emailService
            .DidNotReceive()
            .SendEmailVerificationEmailAsync(
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
        const string fallbackLink = "https://auth.nexushub.page/verify-token";

        _firebaseAuthService
            .GenerateEmailVerificationLinkAsync(
                email,
                "https://nexushub.page/verify-email",
                Arg.Any<CancellationToken>()
            )
            .Returns(fallbackLink);

        var command = new SendVerificationEmailCommand(email);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _emailService
            .Received(1)
            .SendEmailVerificationEmailAsync(
                email,
                fallbackLink,
                Arg.Any<CancellationToken>()
            );
    }
}
