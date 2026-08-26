using System.Text.Json;
using Cronos;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Automations.Commands;

// Compartilhado entre Create/UpdateAutomationCommandValidator — falhar cedo
// aqui evita que um cron sintaticamente inválido chegue ao
// IAutomationSchedulerService (Hangfire/Cronos lançaria em runtime, no
// dispatch, bem mais tarde e sem contexto de qual requisição causou).
public static class AutomationRulePayloadValidation
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static List<string> Validate(string rulePayload)
    {
        var errors = new List<string>();

        AutomationPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<AutomationPayload>(rulePayload, JsonOptions);
        }
        catch (JsonException)
        {
            errors.Add("O payload da automação não é um JSON válido.");
            return errors;
        }

        if (payload == null)
        {
            errors.Add("O payload da automação não pôde ser interpretado.");
            return errors;
        }

        var cronExpression = payload.GetTimeTriggerCronExpression();
        if (cronExpression == null)
            return errors;

        try
        {
            CronExpression.Parse(cronExpression);
        }
        catch (CronFormatException)
        {
            errors.Add($"A expressão cron \"{cronExpression}\" é inválida.");
        }

        return errors;
    }
}
