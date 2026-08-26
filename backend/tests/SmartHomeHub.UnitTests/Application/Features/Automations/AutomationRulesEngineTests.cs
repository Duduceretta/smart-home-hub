using FluentAssertions;
using SmartHomeHub.Application.Features.Automations.Engine;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.UnitTests.Application.Features.Automations;

public class AutomationRulesEngineTests
{
    private readonly AutomationRulesEngine _sut = new(new AutomationConditionCompiler());

    [Fact]
    public void Evaluate_WhenTypeDiscriminatorIsNotFirstProperty_ShouldNotThrow()
    {
        // O Postgres jsonb NÃO preserva a ordem original das chaves do JSON
        // (reordena por tamanho) — "id" acaba antes de "type" no payload real
        // salvo em produção. O System.Text.Json só localiza o discriminador
        // polimórfico fora de ordem com AllowOutOfOrderMetadataProperties=true
        // (ver AutomationPayloadJsonOptions). Esse teste trava essa regressão.
        var automation = new Automation
        {
            IsActive = true,
            RulePayload = """
                {"actions": [], "triggers": [{"id": "t1", "type": "time", "cronExpression": "0 22 * * *"}], "conditions": null}
                """,
        };
        var context = new AutomationEvaluationContext(Guid.Empty, false, null, null);

        var act = () => _sut.Evaluate(automation, context);

        act.Should().NotThrow();
    }

    [Fact]
    public void Evaluate_WithNoConditions_ShouldAlwaysReturnTrue()
    {
        var automation = new Automation
        {
            IsActive = true,
            RulePayload = """
                {"triggers": [], "conditions": null, "actions": []}
                """,
        };
        var context = new AutomationEvaluationContext(Guid.Empty, false, null, null);

        _sut.Evaluate(automation, context).Should().BeTrue();
    }
}
