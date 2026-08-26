using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartHomeHub.Domain.ValueObjects;

// Base ECA (Event, Condition, Action)
public record AutomationPayload(
    [property: JsonPropertyName("triggers")] List<AutomationTrigger> Triggers,
    [property: JsonPropertyName("conditions")] AutomationConditionNode? Conditions,
    [property: JsonPropertyName("actions")] List<AutomationAction> Actions
);

// Triggers (Eventos que iniciam a automação)
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(TimeTrigger), typeDiscriminator: "time")]
[JsonDerivedType(typeof(DeviceStateTrigger), typeDiscriminator: "device_state")]
public abstract record AutomationTrigger(string Id);

public record TimeTrigger(string Id, string CronExpression) : AutomationTrigger(Id);

public record DeviceStateTrigger(string Id, Guid DeviceId, string StateType)
    : AutomationTrigger(Id);

// Conditions (Regras lógicas)
public record AutomationConditionNode(
    [property: JsonPropertyName("operator")] string Operator, // "AND", "OR"
    [property: JsonPropertyName("rules")] List<AutomationRule> Rules
);

public record AutomationRule(
    [property: JsonPropertyName("deviceId")] Guid DeviceId,
    [property: JsonPropertyName("property")] string Property,
    [property: JsonPropertyName("comparison")] string Comparison,
    [property: JsonPropertyName("value")] JsonElement Value
);

// Actions (Efeitos finais no hardware)
public record AutomationAction(
    [property: JsonPropertyName("deviceId")] Guid DeviceId,
    [property: JsonPropertyName("desiredState")] bool DesiredState
);

public static class AutomationPayloadExtensions
{
    // A expressão cron mora dentro do TimeTrigger (Triggers), não como campo
    // solto no payload — um campo `CronExpression` duplicado no nível raiz
    // criaria duas fontes de verdade divergentes para a mesma automação.
    public static string? GetTimeTriggerCronExpression(this AutomationPayload payload) =>
        payload.Triggers?.OfType<TimeTrigger>().FirstOrDefault()?.CronExpression;
}
