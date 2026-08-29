using System.Text.Json;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Commands.CreateAutomation;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Automations.Commands.UpdateAutomation;

public record UpdateAutomationCommand(
    Guid AutomationId,
    string Name,
    string RulePayload,
    bool IsActive,
    string FirebaseUid
) : ICommand<Result>;

public class UpdateAutomationCommandValidator : AbstractValidator<UpdateAutomationCommand>
{
    public UpdateAutomationCommandValidator()
    {
        RuleFor(command => command.AutomationId)
            .NotEmpty()
            .WithMessage("O ID da automação é obrigatório.");

        RuleFor(command => command.Name)
            .NotEmpty()
            .WithMessage("O nome da automação é obrigatório.")
            .MaximumLength(150)
            .WithMessage("O nome da automação não pode passar de 150 caracteres.");

        RuleFor(command => command.RulePayload)
            .NotEmpty()
            .WithMessage("O payload da automação é obrigatório.");

        RuleFor(command => command.RulePayload)
            .Custom(
                (rulePayload, context) =>
                {
                    if (string.IsNullOrWhiteSpace(rulePayload))
                        return;

                    foreach (var error in AutomationRulePayloadValidation.Validate(rulePayload))
                    {
                        context.AddFailure(nameof(UpdateAutomationCommand.RulePayload), error);
                    }
                }
            );
    }
}

public class UpdateAutomationCommandHandler(
    IAppDbContext dbContext,
    IAutomationSchedulerService schedulerService
) : ICommandHandler<UpdateAutomationCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateAutomationCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (user == null)
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado no sistema."));

        var automation = await dbContext.Automations.FirstOrDefaultAsync(
            automation => automation.Id == request.AutomationId && automation.UserId == user.Id,
            cancellationToken
        );

        if (automation == null)
            return Result.Failure(
                new Error(
                    "Automation.NotFound",
                    "Automação não encontrada ou sem permissão de acesso."
                )
            );

        var payload = JsonSerializer.Deserialize<AutomationPayload>(
            request.RulePayload,
            AutomationPayloadJsonOptions.Default
        );
        var trigger = payload?.Triggers?.FirstOrDefault();

        automation.Name = request.Name;
        automation.RulePayload = request.RulePayload;
        automation.IsActive = request.IsActive;
        automation.TriggerKind =
            trigger is TimeTrigger ? AutomationTriggerKind.Schedule : AutomationTriggerKind.Sensor;
        automation.IsDraft = trigger is null || payload?.Actions is null || payload.Actions.Count == 0;

        // UpdatedAt é setado automaticamente pelo AppDbContext.SaveChangesAsync
        // para toda entidade Modified — é essa marca de tempo que invalida o
        // cache de compilação do AutomationRulesEngine, então não precisa
        // (e não deve) ser setada manualmente aqui.
        await dbContext.SaveChangesAsync(cancellationToken);

        // Só mexe no Hangfire depois do commit (mesmo motivo do Create): se o
        // SaveChanges falhasse, não queremos ter religado ou removido um
        // agendamento que não reflete o que está no banco.
        var cronExpression = payload?.GetTimeTriggerCronExpression();

        if (request.IsActive && cronExpression != null)
        {
            schedulerService.ScheduleAutomation(automation.Id, cronExpression);
        }
        else
        {
            // Inativa, ou o Time Trigger foi removido do payload nesta edição —
            // em ambos os casos não pode sobrar um Recurring Job órfão no Hangfire.
            schedulerService.UnscheduleAutomation(automation.Id);
        }

        return Result.Success();
    }
}
