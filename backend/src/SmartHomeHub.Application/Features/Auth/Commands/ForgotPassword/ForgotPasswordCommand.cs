using System.Web;
using FluentValidation;
using Mediator;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
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
            await Task.Delay(Random.Shared.Next(200, 300), cancellationToken);
            logger.LogInformation(
                "Solicitação de redefinição de senha concluída para {EmailMasked}",
                MaskEmail(request.Email)
            );
            return Result.Success();
        }

        var actionUrl = BuildDirectActionUrl(rawResetLink);

        await emailService.SendPasswordResetEmailAsync(request.Email, actionUrl, cancellationToken);

        logger.LogInformation(
            "E-mail de recuperação de senha enviado com sucesso para {EmailMasked}",
            MaskEmail(request.Email)
        );

        return Result.Success();
    }

    /// <summary>
    /// Extrai o 'oobCode' do link bruto retornado pelo Firebase Admin SDK para apontar diretamente
    /// para o formulário de redefinição do Nexus Hub, com 'mode=resetPassword' e 'oobCode' na query string.
    /// </summary>
    private static string BuildDirectActionUrl(string rawLink)
    {
        try
        {
            var uri = new Uri(rawLink);
            var query = HttpUtility.ParseQueryString(uri.Query);
            var oobCode = query["oobCode"];

            if (!string.IsNullOrWhiteSpace(oobCode))
            {
                return $"{ResetPasswordContinueUrl}?mode=resetPassword&oobCode={Uri.EscapeDataString(oobCode)}";
            }
        }
        catch
        {
            // Em caso de falha de parsing, utiliza o link gerado pelo Firebase Admin como fallback seguro
        }

        return rawLink;
    }

    private static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            return "***";

        var parts = email.Split('@');
        var name = parts[0];
        var domain = parts[1];

        var maskedName = name.Length switch
        {
            <= 2 => $"{name[0]}*",
            _ => $"{name[0]}***{name[^1]}",
        };

        return $"{maskedName}@{domain}";
    }
}
