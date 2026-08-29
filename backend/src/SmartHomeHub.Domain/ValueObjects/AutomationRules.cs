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

    // Sem isso, o worker de telemetria avaliaria também automações puramente
    // por horário (sem DeviceStateTrigger) a cada evento de qualquer
    // dispositivo — e como um gatilho de tempo puro não tem Conditions, o
    // compiler resolve pra "sempre verdadeiro", disparando a automação a
    // cada poucos segundos em vez de só no horário agendado.
    public static bool HasDeviceStateTrigger(this AutomationPayload payload) =>
        payload.Triggers?.OfType<DeviceStateTrigger>().Any() ?? false;

    // Todo device referenciado pelo payload, usado pra cruzar automações
    // com um ambiente/dispositivo específico (GetRoomsQuery,
    // GetRoomAutomationsQuery) sem duplicar o mesmo laço de
    // Triggers/Conditions/Actions em cada consumidor.
    public static HashSet<Guid> GetReferencedDeviceIds(this AutomationPayload payload)
    {
        var referencedDeviceIds = new HashSet<Guid>();

        foreach (var trigger in payload.Triggers ?? [])
        {
            if (trigger is DeviceStateTrigger deviceStateTrigger)
                referencedDeviceIds.Add(deviceStateTrigger.DeviceId);
        }

        foreach (var rule in payload.Conditions?.Rules ?? [])
            referencedDeviceIds.Add(rule.DeviceId);

        foreach (var action in payload.Actions ?? [])
            referencedDeviceIds.Add(action.DeviceId);

        return referencedDeviceIds;
    }

    // RulePayload corrompido/rascunho incompleto não deve derrubar o
    // endpoint inteiro — cada consumidor decide o que fazer com null
    // (normalmente: ignorar essa automação e seguir pras próximas).
    public static AutomationPayload? TryDeserializeRulePayload(string rulePayloadJson)
    {
        try
        {
            return JsonSerializer.Deserialize<AutomationPayload>(
                rulePayloadJson,
                AutomationPayloadJsonOptions.Default
            );
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

// Fonte única das JsonSerializerOptions usadas para (des)serializar
// AutomationPayload — antes cada consumidor (validator, handlers, worker,
// rules engine) duplicava sua própria instância, e nenhuma delas tinha
// AllowOutOfOrderMetadataProperties. Resultado: o Postgres armazena
// RulePayload como `jsonb`, que NÃO preserva a ordem original das chaves do
// JSON (reordena por tamanho), então "type" deixa de ser a primeira
// propriedade do trigger e o System.Text.Json falha ao localizar o
// discriminador polimórfico ("must specify a type discriminator") — mesmo
// com o "type" presente no JSON, só que fora de ordem. Uma única fonte
// evita a mesma falha reaparecer numa 6ª cópia divergente no futuro.
public static class AutomationPayloadJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowOutOfOrderMetadataProperties = true,
    };
}
