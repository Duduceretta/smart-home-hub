using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Automations.Commands.DeleteAutomation;

public record DeleteAutomationCommand(Guid AutomationId, string FirebaseUid) : ICommand<Result>;

public class DeleteAutomationCommandValidator : AbstractValidator<DeleteAutomationCommand>
{
    public DeleteAutomationCommandValidator()
    {
        RuleFor(command => command.AutomationId)
            .NotEmpty()
            .WithMessage("O ID da automação é obrigatório.");
    }
}

public class DeleteAutomationCommandHandler(
    IAppDbContext dbContext,
    IAutomationSchedulerService schedulerService
) : ICommandHandler<DeleteAutomationCommand, Result>
{
    public async ValueTask<Result> Handle(
        DeleteAutomationCommand request,
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

        dbContext.Automations.Remove(automation);
        await dbContext.SaveChangesAsync(cancellationToken);

        // O AutomationTimeTriggerJob já se auto-desagenda ao encontrar a
        // automação excluída/inativa (Fase 4), mas remover o Recurring Job
        // aqui evita uma execução a mais rodando no vazio até isso acontecer.
        schedulerService.UnscheduleAutomation(automation.Id);

        return Result.Success();
    }
}
