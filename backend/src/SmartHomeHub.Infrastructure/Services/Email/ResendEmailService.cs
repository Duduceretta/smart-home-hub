using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services.Email;

public class ResendEmailService(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<ResendEmailService> logger
) : IEmailService
{
    private const string ResendApiEndpoint = "https://api.resend.com/emails";

    public Task SendPasswordResetEmailAsync(
        string recipientEmail,
        string resetLink,
        CancellationToken cancellationToken = default
    )
    {
        var htmlContent = EmailTemplates.GetPasswordResetTemplate(resetLink);
        return SendEmailAsync(
            recipientEmail,
            "Recuperação de Senha — Nexus Hub",
            htmlContent,
            cancellationToken
        );
    }

    public Task SendEmailVerificationEmailAsync(
        string recipientEmail,
        string verificationLink,
        CancellationToken cancellationToken = default
    )
    {
        var htmlContent = EmailTemplates.GetEmailVerificationTemplate(verificationLink);
        return SendEmailAsync(
            recipientEmail,
            "Confirmação de E-mail — Nexus Hub",
            htmlContent,
            cancellationToken
        );
    }

    private async Task SendEmailAsync(
        string recipientEmail,
        string subject,
        string htmlContent,
        CancellationToken cancellationToken
    )
    {
        var apiKey = GetApiKey();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogError(
                "A chave de API do Resend não foi configurada. Defina 'Resend:ApiKey' ou a variável 'RESEND_API_KEY'."
            );
            throw new InvalidOperationException("Serviço de envio de e-mails não configurado.");
        }

        var senderEmail = configuration["Resend:SenderEmail"] ?? "noreply@mail.nexushub.page";
        var senderName = configuration["Resend:SenderName"] ?? "Nexus Hub";
        var from = $"{senderName} <{senderEmail}>";

        var payload = new
        {
            from,
            to = new[] { recipientEmail },
            subject,
            html = htmlContent,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, ResendApiEndpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = JsonContent.Create(payload);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha de rede ao conectar à API do Resend.");
            throw;
        }

        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError(
                "Erro retornado pela API do Resend. StatusCode: {StatusCode}, Resposta: {ResponseBody}",
                (int)response.StatusCode,
                responseBody
            );
            throw new HttpRequestException(
                $"Falha ao enviar e-mail via Resend: HTTP {(int)response.StatusCode}"
            );
        }
    }

    private string? GetApiKey()
    {
        return configuration["Resend:ApiKey"]
            ?? configuration["RESEND_API_KEY"]
            ?? Environment.GetEnvironmentVariable("RESEND_API_KEY")
            ?? Environment.GetEnvironmentVariable("Resend__ApiKey");
    }
}
