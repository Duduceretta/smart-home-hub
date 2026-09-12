using System.Net;

namespace SmartHomeHub.Infrastructure.Services.Email;

public static class EmailTemplates
{
    public static string GetPasswordResetTemplate(string resetLink)
    {
        var encodedLink = WebUtility.HtmlEncode(resetLink);

        return $@"<!DOCTYPE html>
<html lang=""pt-BR"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Recuperação de Senha — Nexus Hub</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #fafafa;"">
    <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #09090b; padding: 40px 16px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" width=""100%"" style=""max-width: 520px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);"">
                    <!-- Cabeçalho / Branding -->
                    <tr>
                        <td style=""padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #27272a;"">
                            <div style=""display: inline-block; vertical-align: middle; margin-bottom: 8px;"">
                                <span style=""font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #12967a;"">N</span><span style=""font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #fafafa;"">EXUS</span>
                                <span style=""font-size: 24px; font-weight: 300; letter-spacing: -0.5px; color: #a1a1aa; margin-left: 4px;"">HUB</span>
                            </div>
                            <div style=""font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a; font-weight: 500;"">
                                Casa Inteligente de Alta Performance
                            </div>
                        </td>
                    </tr>
                    <!-- Conteúdo Principal -->
                    <tr>
                        <td style=""padding: 32px;"">
                            <h1 style=""margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #fafafa; text-align: center;"">
                                Redefinição de Senha
                            </h1>
                            <p style=""margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;"">
                                Olá,
                            </p>
                            <p style=""margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;"">
                                Recebemos uma solicitação para redefinir a senha de acesso à sua conta no <strong style=""color: #fafafa;"">Nexus Hub</strong>. Clique no botão abaixo para definir sua nova senha com segurança:
                            </p>
                            
                            <!-- Botão CTA -->
                            <div style=""text-align: center; margin: 32px 0;"">
                                <a href=""{encodedLink}"" target=""_blank"" style=""display: inline-block; background-color: #12967a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(18, 150, 122, 0.3); letter-spacing: 0.2px;"">
                                    Redefinir minha senha
                                </a>
                            </div>

                            <p style=""margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a;"">
                                Caso o botão acima não funcione no seu cliente de e-mail, copie e cole o link seguro a seguir no seu navegador:
                            </p>
                            <p style=""margin: 0 0 24px 0; font-size: 11px; line-height: 1.4; color: #12967a; word-break: break-all; background-color: #121215; padding: 10px 12px; border-radius: 6px; border: 1px solid #27272a;"">
                                {encodedLink}
                            </p>

                            <!-- Divisor de Rodapé Interno -->
                            <div style=""border-top: 1px solid #27272a; margin-top: 24px; padding-top: 20px;"">
                                <p style=""margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a;"">
                                    Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá segura.
                                </p>
                                <p style=""margin: 0; font-size: 11px; line-height: 1.4; color: #52525b;"">
                                    Por motivos de segurança, este link expira em breve e é válido para uma única utilização.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Rodapé Externo -->
                    <tr>
                        <td style=""padding: 20px 32px; background-color: #121215; border-top: 1px solid #27272a; text-align: center;"">
                            <p style=""margin: 0 0 4px 0; font-size: 11px; color: #71717a;"">
                                © Nexus Hub • Todos os direitos reservados.
                            </p>
                            <p style=""margin: 0; font-size: 10px; color: #52525b;"">
                                Mensagem enviada automaticamente por noreply@mail.nexushub.page
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
}
