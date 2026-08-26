using System.Linq.Expressions;
using System.Text.Json;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Automations.Engine;

/// <summary>
/// O contexto de dados atualizado que será injetado na função compilada no momento da avaliação.
/// </summary>
public record AutomationEvaluationContext(
    Guid TriggeringDeviceId,
    bool IsOn,
    double? PowerUsageWatts,
    double? TemperatureCelsius
);

public interface IAutomationConditionCompiler
{
    /// <summary>
    /// Transforma uma árvore JSON de condições em uma função Lambda nativa do C# ultra-rápida.
    /// </summary>
    Func<AutomationEvaluationContext, bool> Compile(AutomationConditionNode? rootNode);
}

public sealed class AutomationConditionCompiler : IAutomationConditionCompiler
{
    // Nomes que o editor visual manda no JSON (rule.Property) não são os
    // mesmos nomes de propriedade do C# (ex: "temperature" vs
    // TemperatureCelsius) — casar por reflection com só
    // IgnoreCase nunca bate, e o código caía silenciosamente em
    // Expression.Constant(false): a regra "compilava" sem erro nenhum e
    // simplesmente nunca disparava. Mapeamento explícito decopla o
    // contrato externo do nome do campo em C# e falha alto (exceção) na
    // hora de salvar/compilar a automação, não em silêncio a cada evento.
    private static readonly Dictionary<string, string> PropertyAliases = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["isOn"] = nameof(AutomationEvaluationContext.IsOn),
        ["temperature"] = nameof(AutomationEvaluationContext.TemperatureCelsius),
        ["powerUsageWatts"] = nameof(AutomationEvaluationContext.PowerUsageWatts),
        ["deviceId"] = nameof(AutomationEvaluationContext.TriggeringDeviceId),
    };

    public Func<AutomationEvaluationContext, bool> Compile(AutomationConditionNode? rootNode)
    {
        // Se não houver condição (ex: disparador de tempo puro), a regra é sempre verdadeira.
        if (rootNode == null || rootNode.Rules.Count == 0)
            return _ => true;

        var contextParameter = Expression.Parameter(typeof(AutomationEvaluationContext), "ctx");
        var body = BuildExpression(rootNode, contextParameter);

        return Expression
            .Lambda<Func<AutomationEvaluationContext, bool>>(body, contextParameter)
            .Compile();
    }

    private static Expression BuildExpression(
        AutomationConditionNode node,
        ParameterExpression contextParam
    )
    {
        if (node.Rules == null || node.Rules.Count == 0)
            return Expression.Constant(true);

        Expression? combined = null;

        foreach (var rule in node.Rules)
        {
            var ruleExpression = BuildRuleExpression(rule, contextParam);

            if (combined == null)
            {
                combined = ruleExpression;
            }
            else if (node.Operator.Equals("AND", StringComparison.OrdinalIgnoreCase))
            {
                combined = Expression.AndAlso(combined, ruleExpression);
            }
            else // "OR"
            {
                combined = Expression.OrElse(combined, ruleExpression);
            }
        }

        return combined ?? Expression.Constant(true);
    }

    private static Expression BuildRuleExpression(
        AutomationRule rule,
        ParameterExpression contextParam
    )
    {
        // 1. Acessa a propriedade do contexto (ex: ctx.TemperatureCelsius)
        if (!PropertyAliases.TryGetValue(rule.Property, out var contextPropertyName))
        {
            throw new InvalidOperationException(
                $"Propriedade de regra desconhecida: \"{rule.Property}\". "
                    + $"Valores aceitos: {string.Join(", ", PropertyAliases.Keys)}."
            );
        }

        var propertyInfo = typeof(AutomationEvaluationContext).GetProperty(contextPropertyName)!;

        var propertyAccess = Expression.MakeMemberAccess(contextParam, propertyInfo);

        // 2. Extrai o valor esperado (do JSONElement que corrigimos antes!)
        object expectedValue = ExtractValue(rule.Value, propertyInfo.PropertyType);
        var constantValue = Expression.Constant(expectedValue, propertyInfo.PropertyType);

        // 3. Monta a comparação matemática, considerando nullables
        return rule.Comparison switch
        {
            "==" => Expression.Equal(propertyAccess, constantValue),
            "!=" => Expression.NotEqual(propertyAccess, constantValue),
            ">" => Expression.GreaterThan(propertyAccess, constantValue),
            ">=" => Expression.GreaterThanOrEqual(propertyAccess, constantValue),
            "<" => Expression.LessThan(propertyAccess, constantValue),
            "<=" => Expression.LessThanOrEqual(propertyAccess, constantValue),
            _ => Expression.Constant(false),
        };
    }

    private static object ExtractValue(JsonElement jsonElement, Type targetType)
    {
        // Lida com tipos Nullable<T> (ex: double?)
        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        return underlyingType.Name switch
        {
            nameof(Boolean) => jsonElement.GetBoolean(),
            nameof(Int32) => jsonElement.GetInt32(),
            nameof(Double) => jsonElement.GetDouble(),
            nameof(String) => jsonElement.GetString() ?? string.Empty,
            nameof(Guid) => jsonElement.GetGuid(),
            _ => throw new InvalidOperationException(
                $"Tipo não suportado na compilação da regra: {underlyingType.Name}"
            ),
        };
    }
}
