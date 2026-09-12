using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Infrastructure.Services.Email;

namespace SmartHomeHub.UnitTests.Infrastructure.Services;

public class ResendEmailServiceTests
{
    private readonly ILogger<ResendEmailService> _logger = Substitute.For<
        ILogger<ResendEmailService>
    >();

    private class MockHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        public HttpRequestMessage? CapturedRequest { get; private set; }
        public string? CapturedContent { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            CapturedRequest = request;
            if (request.Content != null)
            {
                CapturedContent = await request.Content.ReadAsStringAsync(cancellationToken);
            }
            return response;
        }
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_Success_ShouldPostCorrectPayloadToResend()
    {
        // Arrange
        const string apiKey = "re_test_123456789";
        const string recipient = "test.user@nexushub.page";
        const string resetLink =
            "https://nexushub.page/reset-password?mode=resetPassword&oobCode=token-123";

        var configValues = new Dictionary<string, string?>
        {
            ["Resend:ApiKey"] = apiKey,
            ["Resend:SenderEmail"] = "noreply@mail.nexushub.page",
            ["Resend:SenderName"] = "Nexus Hub",
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();

        var mockHandler = new MockHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"id\": \"msg_123\"}"),
            }
        );
        var httpClient = new HttpClient(mockHandler);
        var sut = new ResendEmailService(httpClient, configuration, _logger);

        // Act
        await sut.SendPasswordResetEmailAsync(recipient, resetLink, CancellationToken.None);

        // Assert
        mockHandler.CapturedRequest.Should().NotBeNull();
        mockHandler.CapturedRequest!.Method.Should().Be(HttpMethod.Post);
        mockHandler
            .CapturedRequest.RequestUri.Should()
            .Be(new Uri("https://api.resend.com/emails"));
        mockHandler.CapturedRequest.Headers.Authorization.Should().NotBeNull();
        mockHandler.CapturedRequest.Headers.Authorization!.Scheme.Should().Be("Bearer");
        mockHandler.CapturedRequest.Headers.Authorization.Parameter.Should().Be(apiKey);

        mockHandler.CapturedContent.Should().NotBeNull();
        var jsonDoc = JsonDocument.Parse(mockHandler.CapturedContent!);
        var root = jsonDoc.RootElement;

        root.GetProperty("from").GetString().Should().Be("Nexus Hub <noreply@mail.nexushub.page>");
        root.GetProperty("to")[0].GetString().Should().Be(recipient);
        root.GetProperty("subject").GetString().Should().Be("Recuperação de Senha — Nexus Hub");
        root.GetProperty("html").GetString().Should().Contain(WebUtility.HtmlEncode(resetLink));
        root.GetProperty("html").GetString().Should().Contain("Nexus Hub");
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_WhenApiKeyMissing_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();
        var mockHandler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK));
        var httpClient = new HttpClient(mockHandler);
        var sut = new ResendEmailService(httpClient, configuration, _logger);

        // Act
        var act = () =>
            sut.SendPasswordResetEmailAsync(
                "user@nexushub.page",
                "https://link",
                CancellationToken.None
            );

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*não configurado*");
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_WhenResendReturnsError_ShouldThrowHttpRequestException()
    {
        // Arrange
        var configValues = new Dictionary<string, string?> { ["Resend:ApiKey"] = "re_invalid_key" };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();

        var mockHandler = new MockHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.Unauthorized)
            {
                Content = new StringContent(
                    "{\"statusCode\": 401, \"message\": \"API key is invalid\"}"
                ),
            }
        );
        var httpClient = new HttpClient(mockHandler);
        var sut = new ResendEmailService(httpClient, configuration, _logger);

        // Act
        var act = () =>
            sut.SendPasswordResetEmailAsync(
                "user@nexushub.page",
                "https://link",
                CancellationToken.None
            );

        // Assert
        await act.Should().ThrowAsync<HttpRequestException>().WithMessage("*HTTP 401*");
    }
}
