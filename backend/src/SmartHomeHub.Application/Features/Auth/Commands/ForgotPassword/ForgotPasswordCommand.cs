using FluentValidation;
using Mediator;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Auth.Common;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Auth.Commands.ForgotPassword;

public record ForgotPasswordCommand(string Email) : ICommand<Result>;

public class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("O e-mail é obrigatório.")
            .EmailAddress()
            .WithMessage("Digite um formato de e-mail válido.");
    }
}

/// <summary>
/// Processa a solicitação de redefinição de senha:
/// 1. Solicita a geração do link seguro ao Firebase Admin SDK.
/// 2. Se o e-mail não existir no Firebase, executa uma pausa uniforme simulada (jitter)
///    e retorna sucesso silencioso para prevenir enumeração de contas e análise de timing.
/// 3. Se o e-mail existir, constrói o link de ação e dispara o e-mail transacional via Resend.
/// 4. O link gerado e a chave de API nunca são expostos em logs ou respostas HTTP.
/// </summary>
public class ForgotPasswordCommandHandler(
    IFirebaseAuthService firebaseAuthService,
    IEmailService emailService,
    ILogger<ForgotPasswordCommandHandler> logger
) : ICommandHandler<ForgotPasswordCommand, Result>
{
    private const string ResetPasswordContinueUrl = "https://nexushub.page/reset-password";

    public async ValueTask<Result> Handle(
        ForgotPasswordCommand request,
        CancellationToken cancellationToken
    )
    {
        var rawResetLink = await firebaseAuthService.GeneratePasswordResetLinkAsync(
            request.Email,
            ResetPasswordContinueUrl,
            cancellationToken
        );

        if (string.IsNullOrWhiteSpace(rawResetLink))
        {
            // Usuário não encontrado no Firebase: aplica atraso estocástico equivalente à latência
            // de envio do e-mail para mitigar timing attacks na enumeração de usuários.
            await AuthActionLinkHelper.SimulateUniformLatencyAsync(cancellationToken);
            logger.LogInformation(
                "Solicitação de redefinição de senha concluída para {EmailMasked}",
                AuthActionLinkHelper.MaskEmail(request.Email)
            );
            return Result.Success();
        }

        var actionUrl = AuthActionLinkHelper.BuildDirectActionUrl(
            rawResetLink,
            ResetPasswordContinueUrl,
            "resetPassword"
        );

        await emailService.SendPasswordResetEmailAsync(request.Email, actionUrl, cancellationToken);

        logger.LogInformation(
            "E-mail de recuperação de senha enviado com sucesso para {EmailMasked}",
            AuthActionLinkHelper.MaskEmail(request.Email)
        );

        return Result.Success();
    }
}
