using System.Security.Claims;

namespace SmartHomeHub.Api.Extensions;

/// <summary>
/// Métodos de extensão para ClaimsPrincipal facilitando acesso a claims de autenticação.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    private const string UserIdClaimType = "user_id";

    /// <summary>
    /// Obtém o Firebase UID do usuário autenticado a partir da claim 'user_id' ou ClaimTypes.NameIdentifier.
    /// </summary>
    public static string? GetFirebaseUid(this ClaimsPrincipal? principal)
    {
        return principal?.FindFirst(UserIdClaimType)?.Value
            ?? principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}
