using Microsoft.AspNetCore.Mvc;

namespace SmartHomeHub.Api.Endpoints;

public static class DevEndpoints
{
    public static void MapDevEndpoints(this IEndpointRouteBuilder app, IWebHostEnvironment env)
    {
        if (!env.IsDevelopment())
            return;

        app.MapPost(
                "/api/dev/token",
                async (
                    [FromBody] DevTokenRequest request,
                    HttpClient httpClient,
                    IConfiguration config
                ) =>
                {
                    var firebaseApiKey = config["Firebase:WebApiKey"];

                    if (string.IsNullOrEmpty(firebaseApiKey))
                        return Results.Problem(
                            "Firebase WebApiKey não configurada no arquivo .env"
                        );

                    var response = await httpClient.PostAsJsonAsync(
                        $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebaseApiKey}",
                        new
                        {
                            email = request.Email,
                            password = request.Password,
                            returnSecureToken = true,
                        }
                    );

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorJson = await response.Content.ReadAsStringAsync();

                        return Results.Problem(
                            detail: errorJson,
                            statusCode: StatusCodes.Status400BadRequest,
                            title: "Dev.FirebaseAuthFailed",
                            type: "https://tools.ietf.org/html/rfc7231#section-6.5.1"
                        );
                    }

                    var result =
                        await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                    var idToken = result.GetProperty("idToken").GetString();

                    return Results.Text(idToken);
                }
            )
            .AllowAnonymous()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Gera um token JWT do Firebase via E-mail/Senha")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Facilita os testes no Scalar gerando o token necessário para as outras rotas. Copie o token retornado e cole no botão 'Authentication' do Scalar."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}

public record DevTokenRequest(string Email, string Password);
