using System.Text.Json;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Automations.Commands.CreateAutomation;

public record CreateAutomationCommand(
    string Name,
    string RulePayload,
    bool IsActive,
    string FirebaseUid
) : ICommand<Result<Guid>>;

public class CreateAutomationCommandValidator : AbstractValidator<CreateAutomationCommand>
{
    public CreateAutomationCommandValidator()
    {
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
                        context.AddFailure(nameof(CreateAutomationCommand.RulePayload), error);
                    }
                }
            );
    }
}

public class CreateAutomationCommandHandler(
    IAppDbContext dbContext,
    IAutomationSchedulerService schedulerService
) : ICommandHandler<CreateAutomationCommand, Result<Guid>>
{
    public async ValueTask<Result<Guid>> Handle(
        CreateAutomationCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(
            user => user.ExternalAuthUid == request.FirebaseUid,
            cancellationToken
        );

        if (user == null)
        {
            return Result.Failure<Guid>(
                new Error("User.NotFound", "Usuário não encontrado no sistema.")
            );
        }

        var automation = new Automation
        {
            UserId = user.Id,
            Name = request.Name,
            RulePayload = request.RulePayload,
            IsActive = request.IsActive,
        };

        dbContext.Automations.Add(automation);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Só toca o Hangfire depois do commit: se o SaveChanges falhasse, um
        // agendamento órfão (sem Automation correspondente no banco) ficaria
        // rodando pra sempre.
        if (request.IsActive)
        {
            var payload = JsonSerializer.Deserialize<AutomationPayload>(
                request.RulePayload,
                AutomationPayloadJsonOptions.Default
            );
            var cronExpression = payload?.GetTimeTriggerCronExpression();

            if (cronExpression != null)
            {
                schedulerService.ScheduleAutomation(automation.Id, cronExpression);
            }
        }

        return Result.Success(automation.Id);
    }
}
