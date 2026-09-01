using System.Net;
using FluentAssertions;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Cors;

public class CorsPreflightTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    // Regressão do bug: preflight (OPTIONS) voltando 204 sem Access-Control-Allow-Origin
    // em toda rota, porque a política CORS não estava sendo resolvida (nome errado em
    // UseCors, ordem do pipeline, ou lista de origens vazia por config não carregada).
    [Fact]
    public async Task Preflight_DevicesEndpoint_WithAllowedOrigin_ReturnsAccessControlAllowOriginHeader()
    {
        const string allowedOrigin = "http://localhost:5173";

        var request = new HttpRequestMessage(HttpMethod.Options, "/api/devices");
        request.Headers.Add("Origin", allowedOrigin);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await Client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        response.Headers.Should().ContainKey("Access-Control-Allow-Origin");
        response
            .Headers.GetValues("Access-Control-Allow-Origin")
            .Should()
            .ContainSingle()
            .Which.Should()
            .Be(allowedOrigin);
    }
}
