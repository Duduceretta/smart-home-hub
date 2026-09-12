namespace SmartHomeHub.Application.Common.Interfaces;

public interface IEmailService
{
    /// <summary>
    /// Dispara o e-mail transacional com o link de recuperação de senha.
    /// </summary>
    Task SendPasswordResetEmailAsync(
        string recipientEmail,
        string resetLink,
        CancellationToken cancellationToken = default
    );
}
