using FluentAssertions;
using SmartHomeHub.Application.Features.Auth.Common;

namespace SmartHomeHub.UnitTests.Application.Features.Auth.Common;

public class AuthActionLinkHelperTests
{
    [Theory]
    [InlineData(null, "***")]
    [InlineData("", "***")]
    [InlineData("   ", "***")]
    [InlineData("sem-arroba", "***")]
    public void MaskEmail_WhenInvalidOrMissingAt_ShouldReturnThreeAsterisks(
        string? input,
        string expected
    )
    {
        var result = AuthActionLinkHelper.MaskEmail(input);
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("a@dominio.com", "a*@dominio.com")]
    [InlineData("ed@dominio.com", "e*@dominio.com")]
    [InlineData("edu@dominio.com", "e***u@dominio.com")]
    [InlineData("usuario.teste@nexushub.page", "u***e@nexushub.page")]
    public void MaskEmail_WhenValidEmail_ShouldMaskLocalPart(string input, string expected)
    {
        var result = AuthActionLinkHelper.MaskEmail(input);
        result.Should().Be(expected);
    }

    [Fact]
    public void BuildDirectActionUrl_WhenRawLinkContainsOobCode_ShouldConstructCustomUrl()
    {
        const string rawLink =
            "https://smart-home-hub-eduardo.firebaseapp.com/__/auth/action?apiKey=AIzaFake&mode=resetPassword&oobCode=code-123-abc&continueUrl=https://nexushub.page/reset-password";
        const string continueUrl = "https://nexushub.page/reset-password";
        const string mode = "resetPassword";

        var result = AuthActionLinkHelper.BuildDirectActionUrl(rawLink, continueUrl, mode);

        result
            .Should()
            .Be("https://nexushub.page/reset-password?mode=resetPassword&oobCode=code-123-abc");
    }

    [Fact]
    public void BuildDirectActionUrl_WhenRawLinkLacksOobCode_ShouldReturnRawLink()
    {
        const string rawLink = "https://nexushub.page/custom-path?apiKey=AIzaFake";
        const string continueUrl = "https://nexushub.page/reset-password";
        const string mode = "resetPassword";

        var result = AuthActionLinkHelper.BuildDirectActionUrl(rawLink, continueUrl, mode);

        result.Should().Be(rawLink);
    }

    [Fact]
    public void BuildDirectActionUrl_WhenRawLinkIsMalformed_ShouldReturnRawLinkFallback()
    {
        const string rawLink = "not-a-valid-uri-::::";
        const string continueUrl = "https://nexushub.page/reset-password";
        const string mode = "resetPassword";

        var result = AuthActionLinkHelper.BuildDirectActionUrl(rawLink, continueUrl, mode);

        result.Should().Be(rawLink);
    }

    [Fact]
    public async Task SimulateUniformLatencyAsync_ShouldCompleteSuccessfully()
    {
        var task = AuthActionLinkHelper.SimulateUniformLatencyAsync(
            TestContext.Current.CancellationToken
        );
        await task;
        task.IsCompletedSuccessfully.Should().BeTrue();
    }
}
