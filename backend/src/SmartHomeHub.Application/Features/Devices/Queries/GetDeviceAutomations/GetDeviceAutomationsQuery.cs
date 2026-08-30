using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceAutomations;

/// <summary>
/// TriggerKind espelha o mesmo critério do equivalente de Ambientes
/// (GetRoomAutomationsQuery): "schedule" se o primeiro trigger é de
/// horário, "sensor" se é de estado de dispositivo, "unknown" se o
/// RulePayload não pôde ser interpretado.
/// </summary>
public record DeviceAutomationDto(Guid Id, string Name, bool IsActive, string TriggerKind);

public record GetDeviceAutomationsQuery(Guid DeviceId, string FirebaseUid)
    : IQuery<Result<List<DeviceAutomationDto>>>;

public class GetDeviceAutomationsQueryValidator : AbstractValidator<GetDeviceAutomationsQuery>
{
    public GetDeviceAutomationsQueryValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Mesmo cruzamento de GetRoomAutomationsQueryHandler, só que o teste de
/// vínculo vira "este device específico está entre os referenciados" em vez
/// de "há overlap com o conjunto de devices do ambiente".
/// </summary>
public class GetDeviceAutomationsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceAutomationsQuery, Result<List<DeviceAutomationDto>>>
{
    public async ValueTask<Result<List<DeviceAutomationDto>>> Handle(
        GetDeviceAutomationsQuery request,
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
            return Result.Failure<List<DeviceAutomationDto>>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == request.DeviceId && device.UserId == user.Id,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<List<DeviceAutomationDto>>(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão de acesso."
                )
            );

        var automations = await dbContext
            .Automations.AsNoTracking()
            .Where(automation => automation.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(automation => automation.Name)
            .Select(automation => new
            {
                automation.Id,
                automation.Name,
                automation.IsActive,
                automation.RulePayload,
            })
            .ToListAsync(cancellationToken);

        var linkedAutomations = new List<DeviceAutomationDto>();

        foreach (var automation in automations)
        {
            var payload = AutomationPayloadExtensions.TryDeserializeRulePayload(
                automation.RulePayload
            );

            if (payload == null)
                continue;

            var referencedDeviceIds = payload.GetReferencedDeviceIds();

            if (!referencedDeviceIds.Contains(request.DeviceId))
                continue;

            var triggerKind = payload.Triggers?.FirstOrDefault() switch
            {
                TimeTrigger => "schedule",
                DeviceStateTrigger => "sensor",
                _ => "unknown",
            };

            linkedAutomations.Add(
                new DeviceAutomationDto(
                    automation.Id,
                    automation.Name,
                    automation.IsActive,
                    triggerKind
                )
            );
        }

        return Result.Success(linkedAutomations);
    }
}
