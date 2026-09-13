using System.Web;

namespace SmartHomeHub.Application.Features.Auth.Common;

public static class AuthActionLinkHelper
{
    /// <summary>
    /// Mascara um endereço de e-mail para logs seguros sem expor a identidade do usuário (ex: a***n@dominio.com).
    /// </summary>
    public static string MaskEmail(string? email)
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

    /// <summary>
    /// Extrai o 'oobCode' do link bruto gerado pelo Firebase Admin SDK para apontar diretamente
    /// para a URL de ação do Nexus Hub com os parâmetros da query string padronizados.
    /// </summary>
    public static string BuildDirectActionUrl(string rawLink, string continueUrl, string mode)
    {
        try
        {
            var uri = new Uri(rawLink);
            var query = HttpUtility.ParseQueryString(uri.Query);
            var oobCode = query["oobCode"];

            if (!string.IsNullOrWhiteSpace(oobCode))
            {
                return $"{continueUrl}?mode={mode}&oobCode={Uri.EscapeDataString(oobCode)}";
            }
        }
        catch
        {
            // Em caso de falha de parsing, utiliza o link gerado pelo Firebase Admin como fallback seguro
        }

        return rawLink;
    }

    /// <summary>
    /// Aplica atraso estocástico uniforme (200-300ms) equivalente à latência de envio de e-mail
    /// para mitigar timing attacks na enumeração de usuários quando a conta não existe.
    /// </summary>
    public static Task SimulateUniformLatencyAsync(CancellationToken cancellationToken = default)
    {
        return Task.Delay(Random.Shared.Next(200, 300), cancellationToken);
    }
}
