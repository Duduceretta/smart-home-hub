using System.Net;

namespace SmartHomeHub.Infrastructure.Services.Email;

public static class EmailTemplates
{
    private const string SafeFontStack = "Arial, Helvetica, sans-serif";

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
<body style=""margin: 0; padding: 0; background-color: #09090b; font-family: {SafeFontStack}; color: #fafafa;"">
    <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #09090b; padding: 40px 16px; font-family: {SafeFontStack};"">
        <tr>
            <td align=""center"" style=""font-family: {SafeFontStack};"">
                <table role=""presentation"" width=""100%"" style=""max-width: 520px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); font-family: {SafeFontStack};"">
                    <!-- Cabeçalho / Branding -->
                    <tr>
                        <td style=""padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #27272a; font-family: {SafeFontStack};"">
                            <div style=""display: inline-block; vertical-align: middle; margin-bottom: 8px; font-family: {SafeFontStack};"">
                                <span style=""font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #12967a; font-family: {SafeFontStack};"">N</span><span style=""font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #fafafa; font-family: {SafeFontStack};"">EXUS</span>
                                <span style=""font-size: 24px; font-weight: 300; letter-spacing: -0.5px; color: #a1a1aa; margin-left: 4px; font-family: {SafeFontStack};"">HUB</span>
                            </div>
                            <div style=""font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a; font-weight: 500; font-family: {SafeFontStack};"">
                                Casa Inteligente de Alta Performance
                            </div>
                        </td>
                    </tr>
                    <!-- Conteúdo Principal -->
                    <tr>
                        <td style=""padding: 32px; font-family: {SafeFontStack};"">
                            <h1 style=""margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #fafafa; text-align: center; font-family: {SafeFontStack};"">
                                Redefinição de Senha
                            </h1>
                            <p style=""margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; font-family: {SafeFontStack};"">
                                Olá,
                            </p>
                            <p style=""margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; font-family: {SafeFontStack};"">
                                Recebemos uma solicitação para redefinir a senha de acesso à sua conta no <strong style=""color: #fafafa; font-family: {SafeFontStack};"">Nexus Hub</strong>. Clique no botão abaixo para definir sua nova senha com segurança:
                            </p>
                            
                            <!-- Botão CTA -->
                            <div style=""text-align: center; margin: 32px 0; font-family: {SafeFontStack};"">
                                <a href=""{encodedLink}"" target=""_blank"" style=""display: inline-block; background-color: #12967a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(18, 150, 122, 0.3); letter-spacing: 0.2px; font-family: {SafeFontStack};"">
                                    Redefinir minha senha
                                </a>
                            </div>

                            <p style=""margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a; font-family: {SafeFontStack};"">
                                Caso o botão acima não funcione no seu cliente de e-mail, copie e cole o link seguro a seguir no seu navegador:
                            </p>
                            <p style=""margin: 0 0 24px 0; font-size: 11px; line-height: 1.5; color: #12967a; word-break: break-all; background-color: #121215; padding: 10px 12px; border-radius: 6px; border: 1px solid #27272a; font-family: {SafeFontStack};"">
                                {encodedLink}
                            </p>

                            <!-- Divisor de Rodapé Interno -->
                            <div style=""border-top: 1px solid #27272a; margin-top: 24px; padding-top: 20px; font-family: {SafeFontStack};"">
                                <p style=""margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a; font-family: {SafeFontStack};"">
                                    Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá segura.
                                </p>
                                <p style=""margin: 0; font-size: 11px; line-height: 1.4; color: #52525b; font-family: {SafeFontStack};"">
                                    Por motivos de segurança, este link expira em breve e é válido para uma única utilização.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Rodapé Externo com Links Legais -->
                    <tr>
                        <td style=""padding: 24px 32px; background-color: #121215; border-top: 1px solid #27272a; text-align: center; font-family: {SafeFontStack};"">
                            <p style=""margin: 0 0 8px 0; font-size: 11px; color: #71717a; font-family: {SafeFontStack};"">
                                <a href=""https://nexushub.page/legal/privacy"" target=""_blank"" style=""color: #a1a1aa; text-decoration: underline; text-underline-offset: 2px; font-family: {SafeFontStack};"">Política de Privacidade</a>
                                <span style=""color: #3f3f46; margin: 0 8px;"">•</span>
                                <a href=""https://nexushub.page/legal/terms"" target=""_blank"" style=""color: #a1a1aa; text-decoration: underline; text-underline-offset: 2px; font-family: {SafeFontStack};"">Termos de Uso</a>
                            </p>
                            <p style=""margin: 0 0 4px 0; font-size: 11px; color: #71717a; font-family: {SafeFontStack};"">
                                © Nexus Hub • Todos os direitos reservados.
                            </p>
                            <p style=""margin: 0; font-size: 10px; color: #52525b; font-family: {SafeFontStack};"">
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

    public static string GetEmailVerificationTemplate(string verificationLink)
    {
        var encodedLink = WebUtility.HtmlEncode(verificationLink);

        return $@"<!DOCTYPE html>
<html lang=""pt-BR"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Confirmação de E-mail — Nexus Hub</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #09090b; font-family: {SafeFontStack}; color: #fafafa;"">
    <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #09090b; padding: 40px 16px; font-family: {SafeFontStack};"">
        <tr>
            <td align=""center"" style=""font-family: {SafeFontStack};"">
                <table role=""presentation"" width=""100%"" style=""max-width: 520px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); font-family: {SafeFontStack};"">
                    <!-- Cabeçalho / Branding -->
                    <tr>
                        <td style=""padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #27272a; font-family: {SafeFontStack};"">
                            <div style=""display: inline-block; vertical-align: middle; margin-bottom: 8px; font-family: {SafeFontStack};"">
                                <span style=""font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #12967a; font-family: {SafeFontStack};"">N</span><span style=""font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #fafafa; font-family: {SafeFontStack};"">EXUS</span>
                                <span style=""font-size: 24px; font-weight: 300; letter-spacing: -0.5px; color: #a1a1aa; margin-left: 4px; font-family: {SafeFontStack};"">HUB</span>
                            </div>
                            <div style=""font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a; font-weight: 500; font-family: {SafeFontStack};"">
                                Casa Inteligente de Alta Performance
                            </div>
                        </td>
                    </tr>
                    <!-- Conteúdo Principal -->
                    <tr>
                        <td style=""padding: 32px; font-family: {SafeFontStack};"">
                            <h1 style=""margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #fafafa; text-align: center; font-family: {SafeFontStack};"">
                                Confirme seu Endereço de E-mail
                            </h1>
                            <p style=""margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; font-family: {SafeFontStack};"">
                                Olá,
                            </p>
                            <p style=""margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; font-family: {SafeFontStack};"">
                                Obrigado por se registrar no <strong style=""color: #fafafa; font-family: {SafeFontStack};"">Nexus Hub</strong>. Para garantir a segurança da sua conta e validar sua titularidade, confirme seu e-mail clicando no botão abaixo:
                            </p>
                            
                            <!-- Botão CTA -->
                            <div style=""text-align: center; margin: 32px 0; font-family: {SafeFontStack};"">
                                <a href=""{encodedLink}"" target=""_blank"" style=""display: inline-block; background-color: #12967a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(18, 150, 122, 0.3); letter-spacing: 0.2px; font-family: {SafeFontStack};"">
                                    Confirmar meu e-mail
                                </a>
                            </div>

                            <p style=""margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a; font-family: {SafeFontStack};"">
                                Caso o botão acima não funcione no seu cliente de e-mail, copie e cole o link seguro a seguir no seu navegador:
                            </p>
                            <p style=""margin: 0 0 24px 0; font-size: 11px; line-height: 1.5; color: #12967a; word-break: break-all; background-color: #121215; padding: 10px 12px; border-radius: 6px; border: 1px solid #27272a; font-family: {SafeFontStack};"">
                                {encodedLink}
                            </p>

                            <!-- Divisor de Rodapé Interno -->
                            <div style=""border-top: 1px solid #27272a; margin-top: 24px; padding-top: 20px; font-family: {SafeFontStack};"">
                                <p style=""margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a; font-family: {SafeFontStack};"">
                                    Se você não solicitou este cadastro no Nexus Hub, nenhuma ação é necessária. Você pode ignorar esta mensagem com segurança.
                                </p>
                                <p style=""margin: 0; font-size: 11px; line-height: 1.4; color: #52525b; font-family: {SafeFontStack};"">
                                    Por motivos de segurança, este link de confirmação expira em breve.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Rodapé Externo com Links Legais -->
                    <tr>
                        <td style=""padding: 24px 32px; background-color: #121215; border-top: 1px solid #27272a; text-align: center; font-family: {SafeFontStack};"">
                            <p style=""margin: 0 0 8px 0; font-size: 11px; color: #71717a; font-family: {SafeFontStack};"">
                                <a href=""https://nexushub.page/legal/privacy"" target=""_blank"" style=""color: #a1a1aa; text-decoration: underline; text-underline-offset: 2px; font-family: {SafeFontStack};"">Política de Privacidade</a>
                                <span style=""color: #3f3f46; margin: 0 8px;"">•</span>
                                <a href=""https://nexushub.page/legal/terms"" target=""_blank"" style=""color: #a1a1aa; text-decoration: underline; text-underline-offset: 2px; font-family: {SafeFontStack};"">Termos de Uso</a>
                            </p>
                            <p style=""margin: 0 0 4px 0; font-size: 11px; color: #71717a; font-family: {SafeFontStack};"">
                                © Nexus Hub • Todos os direitos reservados.
                            </p>
                            <p style=""margin: 0; font-size: 10px; color: #52525b; font-family: {SafeFontStack};"">
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
