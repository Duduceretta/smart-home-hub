using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.UpdateDevice;

public record UpdateDeviceCommand(
    Guid DeviceId,
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    IntegrationType IntegrationType,
    Guid? RoomId,
    string FirebaseUid,
    string? IpAddress = null,
    string? MacAddress = null,
    string? LocalKey = null,
    string? DpsPowerKey = null,
    string? ClientKey = null
) : ICommand<Result>;

public class UpdateDeviceCommandValidator : AbstractValidator<UpdateDeviceCommand>
{
    public UpdateDeviceCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.Name)
            .NotEmpty()
            .WithMessage("O nome do dispositivo é obrigatório.")
            .MaximumLength(100);

        RuleFor(command => command.Brand)
            .NotEmpty()
            .WithMessage("A marca do dispositivo é obrigatória.")
            .MaximumLength(50);

        RuleFor(command => command.ExternalId)
            .NotEmpty()
            .WithMessage("O identificador físico (MAC/ID) é obrigatório.");

        RuleFor(command => command.Type)
            .IsInEnum()
            .WithMessage("O tipo de dispositivo fornecido é inválido.");

        RuleFor(command => command.IntegrationType)
            .IsInEnum()
            .WithMessage("O tipo de integração fornecido é inválido.");
    }
}

public class UpdateDeviceCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<UpdateDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateDeviceCommand request,
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

        var device = await dbContext.Devices.FirstOrDefaultAsync(
            device => device.Id == request.DeviceId && device.UserId == user.Id,
            cancellationToken
        );

        if (device == null)
            return Result.Failure(
                new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão.")
            );

        if (request.RoomId.HasValue && request.RoomId != device.RoomId)
        {
            var roomExists = await dbContext.Rooms.AnyAsync(
                room => room.Id == request.RoomId.Value && room.UserId == user.Id,
                cancellationToken
            );

            if (!roomExists)
                return Result.Failure(
                    new Error(
                        "Room.NotFound",
                        "Ambiente não encontrado ou sem permissão de acesso."
                    )
                );
        }

        device.Name = request.Name;
        device.Brand = request.Brand;
        device.ExternalId = request.ExternalId;
        device.Type = request.Type;
        device.IntegrationType = request.IntegrationType;
        device.RoomId = request.RoomId;

        // Atualiza a configuração aninhada apenas quando um novo valor é
        // informado — o GET nunca devolve estes campos ao frontend, então
        // "vazio" aqui significa "preservar o que já está salvo", não "apagar".
        if (!string.IsNullOrWhiteSpace(request.IpAddress))
            device.Configuration.IpAddress = request.IpAddress;

        if (!string.IsNullOrWhiteSpace(request.MacAddress))
            device.Configuration.MacAddress = request.MacAddress;

        if (!string.IsNullOrWhiteSpace(request.LocalKey))
            device.Configuration.LocalKey = request.LocalKey;

        if (!string.IsNullOrWhiteSpace(request.DpsPowerKey))
            device.Configuration.DpsPowerKey = request.DpsPowerKey;

        if (!string.IsNullOrWhiteSpace(request.ClientKey))
            device.Configuration.ClientKey = request.ClientKey;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
