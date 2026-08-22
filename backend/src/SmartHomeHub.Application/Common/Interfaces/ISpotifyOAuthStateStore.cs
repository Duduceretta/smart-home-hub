namespace SmartHomeHub.Application.Common.Interfaces;

/// <summary>
/// Amarra o `state` opaco do fluxo OAuth2 do Spotify ao `firebaseUid` de quem
/// iniciou a conexão — necessário porque o callback é uma navegação de
/// página inteira (o navegador sai do app e volta), sem o JWT do Firebase.
/// Entradas são de uso único e expiram sozinhas.
/// </summary>
public interface ISpotifyOAuthStateStore
{
    string CreateState(string firebaseUid);

    /// <summary>Resolve e remove a entrada (uso único). Retorna null se não existir/expirou.</summary>
    string? ConsumeState(string state);
}
