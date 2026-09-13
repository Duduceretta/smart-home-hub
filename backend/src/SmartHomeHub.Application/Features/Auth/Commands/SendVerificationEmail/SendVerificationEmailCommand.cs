using FluentValidation;
using Mediator;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Auth.Common;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Auth.Commands.SendVerificationEmail;

public record SendVerificationEmailCommand(string Email) : ICommand<Result>;

public class SendVerificationEmailCommandValidator : AbstractValidator<SendVerificationEmailCommand>
{
    public SendVerificationEmailCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("O e-mail é obrigatório.")
            .EmailAddress()
            .WithMessage("Digite um formato de e-mail válido.");
    }
}

/// <summary>
/// Processa a solicitação de envio de e-mail de verificação de conta:
/// 1. Solicita a geração do link seguro ao Firebase Admin SDK com continueUrl para /verify-email.
/// 2. Se o e-mail não existir no Firebase, executa uma pausa uniforme simulada (jitter)
///    e retorna sucesso silencioso para prevenir enumeração de contas e análise de timing.
/// 3. Se o e-mail existir, constrói o link de ação e dispara o e-mail transacional via Resend.
/// 4. O link gerado e a chave de API nunca são expostos em logs ou respostas HTTP.
/// </summary>
public class SendVerificationEmailCommandHandler(
    IFirebaseAuthService firebaseAuthService,
    IEmailService emailService,
    ILogger<SendVerificationEmailCommandHandler> logger
) : ICommandHandler<SendVerificationEmailCommand, Result>
{
    private const string VerifyEmailContinueUrl = "https://nexushub.page/verify-email";

    public async ValueTask<Result> Handle(
        SendVerificationEmailCommand request,
        CancellationToken cancellationToken
    )
    {
        var rawVerificationLink = await firebaseAuthService.GenerateEmailVerificationLinkAsync(
            request.Email,
            VerifyEmailContinueUrl,
            cancellationToken
        );

        if (string.IsNullOrWhiteSpace(rawVerificationLink))
        {
            // Usuário não encontrado no Firebase: aplica atraso estocástico equivalente à latência
            // de envio do e-mail para mitigar timing attacks na enumeração de usuários.
            await AuthActionLinkHelper.SimulateUniformLatencyAsync(cancellationToken);
            logger.LogInformation(
                "Solicitação de confirmação de e-mail concluída para {EmailMasked}",
                AuthActionLinkHelper.MaskEmail(request.Email)
            );
            return Result.Success();
        }

        var actionUrl = AuthActionLinkHelper.BuildDirectActionUrl(
            rawVerificationLink,
            VerifyEmailContinueUrl,
            "verifyEmail"
        );

        await emailService.SendEmailVerificationEmailAsync(
            request.Email,
            actionUrl,
            cancellationToken
        );

        logger.LogInformation(
            "E-mail de confirmação de conta enviado com sucesso para {EmailMasked}",
            AuthActionLinkHelper.MaskEmail(request.Email)
        );

        return Result.Success();
    }
}
