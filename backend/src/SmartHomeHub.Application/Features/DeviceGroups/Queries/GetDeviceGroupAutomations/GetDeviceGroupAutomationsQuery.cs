using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroupAutomations;

public record DeviceGroupAutomationDto(Guid Id, string Name, bool IsActive, string TriggerKind);

public record GetDeviceGroupAutomationsQuery(Guid GroupId, string FirebaseUid)
    : IQuery<Result<List<DeviceGroupAutomationDto>>>;

public class GetDeviceGroupAutomationsQueryValidator
    : AbstractValidator<GetDeviceGroupAutomationsQuery>
{
    public GetDeviceGroupAutomationsQueryValidator()
    {
        RuleFor(x => x.GroupId).NotEmpty().WithMessage("O ID do grupo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Retorna as automações do usuário cujo gatilho, condição ou ação referenciam algum
/// dispositivo pertencente ao grupo de dispositivos especificado.
/// </summary>
public class GetDeviceGroupAutomationsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceGroupAutomationsQuery, Result<List<DeviceGroupAutomationDto>>>
{
    public async ValueTask<Result<List<DeviceGroupAutomationDto>>> Handle(
        GetDeviceGroupAutomationsQuery request,
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
            return Result.Failure<List<DeviceGroupAutomationDto>>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var group = await dbContext
            .DeviceGroups.AsNoTracking()
            .FirstOrDefaultAsync(
                g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted,
                cancellationToken
            );

        if (group == null)
            return Result.Failure<List<DeviceGroupAutomationDto>>(
                new Error("DeviceGroup.NotFound", "Grupo de dispositivos não encontrado ou sem permissão de acesso.")
            );

        var groupDeviceIds = await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted)
            .SelectMany(g => g.Devices)
            .Where(device => !device.IsDeleted)
            .Select(device => device.Id)
            .ToHashSetAsync(cancellationToken);

        if (groupDeviceIds.Count == 0)
            return Result.Success(new List<DeviceGroupAutomationDto>());

        var automations = await dbContext
            .Automations.AsNoTracking()
            .Where(automation => automation.User.ExternalAuthUid == request.FirebaseUid && !automation.IsDeleted)
            .OrderBy(automation => automation.Name)
            .Select(automation => new
            {
                automation.Id,
                automation.Name,
                automation.IsActive,
                automation.RulePayload,
            })
            .ToListAsync(cancellationToken);

        var linkedAutomations = new List<DeviceGroupAutomationDto>();

        foreach (var automation in automations)
        {
            var referencedIds = AutomationRules.ExtractReferencedDeviceIds(
                automation.RulePayload
            );

            if (referencedIds.Overlaps(groupDeviceIds))
            {
                var triggerKind = AutomationRules.GetPrimaryTriggerKind(
                    automation.RulePayload
                );

                linkedAutomations.Add(
                    new DeviceGroupAutomationDto(
                        automation.Id,
                        automation.Name,
                        automation.IsActive,
                        triggerKind
                    )
                );
            }
        }

        return Result.Success(linkedAutomations);
    }
}
