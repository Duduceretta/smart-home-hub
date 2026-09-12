namespace SmartHomeHub.Application.Common.Interfaces;

public interface IFirebaseAuthService
{
    /// <summary>
    /// Gera um link seguro de recuperação de senha via Firebase Admin SDK.
    /// Retorna null se o usuário não for encontrado no Firebase (para suporte a anti-enumeração).
    /// </summary>
    Task<string?> GeneratePasswordResetLinkAsync(
        string email,
        string continueUrl,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gera um link seguro de verificação de e-mail via Firebase Admin SDK.
    /// Retorna null se o usuário não for encontrado no Firebase (para suporte a anti-enumeração).
    /// </summary>
    Task<string?> GenerateEmailVerificationLinkAsync(
        string email,
        string continueUrl,
        CancellationToken cancellationToken = default
    );
}
