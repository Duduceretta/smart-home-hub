using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Auth.Commands.ForgotPassword;
using SmartHomeHub.Application.Features.Auth.Commands.SendVerificationEmail;

namespace SmartHomeHub.Api.Endpoints;

public record ForgotPasswordRequest(string Email);

public record ForgotPasswordResponse(bool Success);

public record SendVerificationEmailRequest(string Email);

public record SendVerificationEmailResponse(bool Success);

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group
            .MapPost(
                "/forgot-password",
                async (
                    ForgotPasswordRequest request,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var command = new ForgotPasswordCommand(request.Email);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new ForgotPasswordResponse(true));
                }
            )
            .AllowAnonymous()
            .RequireRateLimiting("AuthRateLimit")
            .WithSummary("Solicita a recuperação de senha por e-mail")
            .WithDescription(
                "Gera um link seguro de recuperação via Firebase Admin SDK e envia por e-mail via Resend. Retorna resposta genérica uniforme para prevenir enumeração de contas."
            )
            .Produces<ForgotPasswordResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group
            .MapPost(
                "/send-verification-email",
                async (
                    SendVerificationEmailRequest request,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var command = new SendVerificationEmailCommand(request.Email);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new SendVerificationEmailResponse(true));
                }
            )
            .AllowAnonymous()
            .RequireRateLimiting("AuthRateLimit")
            .WithSummary("Solicita o envio de e-mail de verificação de conta")
            .WithDescription(
                "Gera um link seguro de confirmação de e-mail via Firebase Admin SDK e envia via Resend. Retorna resposta uniforme para mitigar enumeração de contas."
            )
            .Produces<SendVerificationEmailResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);
    }
}
