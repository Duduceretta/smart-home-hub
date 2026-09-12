using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services.Auth;

public class FirebaseAuthService(IConfiguration configuration, ILogger<FirebaseAuthService> logger)
    : IFirebaseAuthService
{
    private static readonly object InitLock = new();
    private static bool _isInitialized;

    public async Task<string?> GeneratePasswordResetLinkAsync(
        string email,
        string continueUrl,
        CancellationToken cancellationToken = default
    )
    {
        EnsureFirebaseInitialized();

        var auth =
            FirebaseAuth.DefaultInstance
            ?? throw new InvalidOperationException(
                "Instância do Firebase Auth não foi inicializada."
            );

        var actionCodeSettings = new ActionCodeSettings
        {
            Url = continueUrl,
            HandleCodeInApp = true,
        };

        try
        {
            return await auth.GeneratePasswordResetLinkAsync(
                email,
                actionCodeSettings,
                cancellationToken
            );
        }
        catch (FirebaseAuthException ex) when (IsUserNotFoundException(ex))
        {
            logger.LogInformation(
                "Usuário não encontrado no Firebase Authentication para solicitação de redefinição."
            );
            return null;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Erro ao solicitar geração de link de redefinição de senha no Firebase."
            );
            throw;
        }
    }

    private static bool IsUserNotFoundException(FirebaseAuthException ex)
    {
        return ex.AuthErrorCode == AuthErrorCode.UserNotFound
            || ex.ErrorCode == ErrorCode.NotFound
            || (
                ex.Message?.Contains("EMAIL_NOT_FOUND", StringComparison.OrdinalIgnoreCase) ?? false
            )
            || (
                ex.Message?.Contains("USER_NOT_FOUND", StringComparison.OrdinalIgnoreCase) ?? false
            );
    }

    private void EnsureFirebaseInitialized()
    {
        if (_isInitialized && FirebaseApp.DefaultInstance != null)
            return;

        lock (InitLock)
        {
            if (_isInitialized && FirebaseApp.DefaultInstance != null)
                return;

            if (FirebaseApp.DefaultInstance != null)
            {
                _isInitialized = true;
                return;
            }

            var credentialJson =
                configuration["Firebase:CredentialJson"]
                ?? Environment.GetEnvironmentVariable("FIREBASE_CREDENTIAL_JSON")
                ?? Environment.GetEnvironmentVariable("Firebase__CredentialJson");

            var credentialPath =
                configuration["Firebase:CredentialPath"]
                ?? Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS")
                ?? Environment.GetEnvironmentVariable("Firebase__CredentialPath");

            GoogleCredential? credential = null;

            if (!string.IsNullOrWhiteSpace(credentialJson))
            {
                using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(credentialJson));
                credential = CredentialFactory.FromStream<ServiceAccountCredential>(stream).ToGoogleCredential();
            }
            else if (!string.IsNullOrWhiteSpace(credentialPath) && File.Exists(credentialPath))
            {
                credential = CredentialFactory.FromFile<ServiceAccountCredential>(credentialPath).ToGoogleCredential();
            }
            else
            {
                try
                {
                    credential = GoogleCredential.GetApplicationDefault();
                }
                catch (Exception ex)
                {
                    logger.LogWarning(
                        "Não foi possível carregar Application Default Credentials: {Message}. Configure 'Firebase:CredentialPath' ou 'Firebase:CredentialJson'.",
                        ex.Message
                    );
                }
            }

            var projectId = configuration["Firebase:ProjectId"] ?? "smart-home-hub-eduardo";

            var options = new AppOptions { ProjectId = projectId };

            if (credential != null)
            {
                options.Credential = credential;
            }

            FirebaseApp.Create(options);
            _isInitialized = true;
        }
    }
}
