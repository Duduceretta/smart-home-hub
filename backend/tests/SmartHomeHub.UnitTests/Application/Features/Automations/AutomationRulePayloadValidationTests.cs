using FluentAssertions;
using SmartHomeHub.Application.Features.Automations.Commands;

namespace SmartHomeHub.UnitTests.Application.Features.Automations;

public class AutomationRulePayloadValidationTests
{
    [Fact]
    public void Validate_WhenPayloadIsNotJson_ShouldReturnError()
    {
        var errors = AutomationRulePayloadValidation.Validate("isso não é json");

        errors.Should().ContainSingle().Which.Should().Contain("JSON válido");
    }

    [Fact]
    public void Validate_WithoutTimeTrigger_ShouldReturnNoErrors()
    {
        const string payload = """
            {
                "triggers": [{ "type": "device_state", "id": "t1", "deviceId": "11111111-1111-1111-1111-111111111111", "stateType": "isOn" }],
                "conditions": null,
                "actions": []
            }
            """;

        var errors = AutomationRulePayloadValidation.Validate(payload);

        errors.Should().BeEmpty();
    }

    [Fact]
    public void Validate_WithValidCronTimeTrigger_ShouldReturnNoErrors()
    {
        const string payload = """
            {
                "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 22 * * *" }],
                "conditions": null,
                "actions": []
            }
            """;

        var errors = AutomationRulePayloadValidation.Validate(payload);

        errors.Should().BeEmpty();
    }

    [Fact]
    public void Validate_WithInvalidCronTimeTrigger_ShouldReturnError()
    {
        const string payload = """
            {
                "triggers": [{ "type": "time", "id": "t1", "cronExpression": "isso não é cron" }],
                "conditions": null,
                "actions": []
            }
            """;

        var errors = AutomationRulePayloadValidation.Validate(payload);

        errors.Should().ContainSingle().Which.Should().Contain("inválida");
    }
}
