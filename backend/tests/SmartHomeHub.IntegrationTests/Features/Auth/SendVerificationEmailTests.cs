using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using SmartHomeHub.Api.Endpoints;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Auth;

public class SendVerificationEmailTests : BaseIntegrationTest
{
    private readonly IFirebaseAuthService _firebaseAuthService;
    private readonly IEmailService _emailService;

    public SendVerificationEmailTests(IntegrationTestWebAppFactory factory)
        : base(factory)
    {
        _firebaseAuthService = factory.Services.GetRequiredService<IFirebaseAuthService>();
        _emailService = factory.Services.GetRequiredService<IEmailService>();
        _firebaseAuthService.ClearReceivedCalls();
        _emailService.ClearReceivedCalls();
    }

    [Fact]
    public async Task SendVerificationEmail_WhenUserExists_ShouldReturnOkWithoutLeakingLink()
    {
        // Arrange
        const string email = "usuario.existente@nexushub.page";
        const string rawFirebaseLink =
            "https://smart-home-hub-eduardo.firebaseapp.com/__/auth/action?apiKey=AIza123&mode=verifyEmail&oobCode=secret-verify-code-777&continueUrl=https://nexushub.page/verify-email";

        _firebaseAuthService
            .GenerateEmailVerificationLinkAsync(
                email,
                "https://nexushub.page/verify-email",
                Arg.Any<CancellationToken>()
            )
            .Returns(rawFirebaseLink);

        var request = new SendVerificationEmailRequest(email);

        // Act
        var response = await Client.PostAsJsonAsync(
            "/api/auth/send-verification-email",
            request,
            TestContext.Current.CancellationToken
        );

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync(
            TestContext.Current.CancellationToken
        );
        content.Should().NotContain("secret-verify-code-777");
        content.Should().NotContain("action?apiKey");

        var responseDto = await response.Content.ReadFromJsonAsync<SendVerificationEmailResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        responseDto.Should().NotBeNull();
        responseDto!.Success.Should().BeTrue();

        await _emailService
            .Received(1)
            .SendEmailVerificationEmailAsync(
                email,
                Arg.Is<string>(link =>
                    link.Contains("oobCode=secret-verify-code-777")
                    && link.StartsWith("https://nexushub.page/verify-email")
                ),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task SendVerificationEmail_WhenUserDoesNotExist_ShouldReturnGenericSuccessWithoutCallingEmailService()
    {
        // Arrange
        const string email = "usuario.inexistente@nexushub.page";

        _firebaseAuthService
            .GenerateEmailVerificationLinkAsync(
                email,
                "https://nexushub.page/verify-email",
                Arg.Any<CancellationToken>()
            )
            .Returns((string?)null);

        var request = new SendVerificationEmailRequest(email);

        // Act
        var response = await Client.PostAsJsonAsync(
            "/api/auth/send-verification-email",
            request,
            TestContext.Current.CancellationToken
        );

        // Assert: Resposta 200 idêntica para anti-enumeração
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseDto = await response.Content.ReadFromJsonAsync<SendVerificationEmailResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        responseDto.Should().NotBeNull();
        responseDto!.Success.Should().BeTrue();

        await _emailService
            .DidNotReceive()
            .SendEmailVerificationEmailAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Theory]
    [InlineData("")]
    [InlineData("email-invalido")]
    [InlineData("sem-arroba.com")]
    public async Task SendVerificationEmail_WhenEmailIsInvalid_ShouldReturnProblemDetails(
        string invalidEmail
    )
    {
        // Arrange
        var request = new SendVerificationEmailRequest(invalidEmail);

        // Act
        var response = await Client.PostAsJsonAsync(
            "/api/auth/send-verification-email",
            request,
            TestContext.Current.CancellationToken
        );

        // Assert
        response
            .StatusCode.Should()
            .BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.UnprocessableEntity);

        var content = await response.Content.ReadAsStringAsync(
            TestContext.Current.CancellationToken
        );
        content.Should().NotContain("oobCode");
    }
}
