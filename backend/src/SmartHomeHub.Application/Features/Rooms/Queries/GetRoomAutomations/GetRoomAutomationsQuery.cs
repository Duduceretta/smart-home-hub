using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRoomAutomations;

/// <summary>
/// TriggerKind espelha o mesmo critério do front-end
/// (parse-automation-rule-payload.ts): "schedule" se o primeiro trigger é
/// de horário, "sensor" se é de estado de dispositivo, "unknown" se o
/// RulePayload não pôde ser interpretado.
/// </summary>
public record RoomAutomationDto(Guid Id, string Name, bool IsActive, string TriggerKind);

public record GetRoomAutomationsQuery(Guid RoomId, string FirebaseUid)
    : IQuery<Result<List<RoomAutomationDto>>>;

public class GetRoomAutomationsQueryValidator : AbstractValidator<GetRoomAutomationsQuery>
{
    public GetRoomAutomationsQueryValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty().WithMessage("O ID do ambiente é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Servidor-side do mesmo cruzamento que o front-end fazia no cliente
/// (buscar todas as automações e comparar deviceId dentro do RulePayload
/// JSON) — reaproveita os mesmos records de desserialização do domínio
/// (AutomationPayload/AutomationPayloadJsonOptions, já usados pelo motor de
/// regras) em vez de duplicar um parser próprio. Existe porque o volume de
/// automações pode crescer (ver débito técnico registrado quando o
/// cruzamento client-side foi implementado) — trazido pro back-end evita
/// baixar e desserializar o JSON de TODAS as automações no navegador a
/// cada troca de ambiente selecionado.
/// </summary>
public class GetRoomAutomationsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomAutomationsQuery, Result<List<RoomAutomationDto>>>
{
    public async ValueTask<Result<List<RoomAutomationDto>>> Handle(
        GetRoomAutomationsQuery request,
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
            return Result.Failure<List<RoomAutomationDto>>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var room = await dbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == request.RoomId && room.UserId == user.Id,
                cancellationToken
            );

        if (room == null)
            return Result.Failure<List<RoomAutomationDto>>(
                new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso.")
            );

        var roomDeviceIds = await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.RoomId == request.RoomId && device.UserId == user.Id && !device.IsDeleted
            )
            .Select(device => device.Id)
            .ToHashSetAsync(cancellationToken);

        if (roomDeviceIds.Count == 0)
            return Result.Success(new List<RoomAutomationDto>());

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

        var linkedAutomations = new List<RoomAutomationDto>();

        foreach (var automation in automations)
        {
            var payload = AutomationPayloadExtensions.TryDeserializeRulePayload(
                automation.RulePayload
            );

            if (payload == null)
                continue;

            var referencedDeviceIds = payload.GetReferencedDeviceIds();

            if (!referencedDeviceIds.Overlaps(roomDeviceIds))
                continue;

            var triggerKind = payload.Triggers?.FirstOrDefault() switch
            {
                TimeTrigger => "schedule",
                DeviceStateTrigger => "sensor",
                _ => "unknown",
            };

            linkedAutomations.Add(
                new RoomAutomationDto(
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
