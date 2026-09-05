using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

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
    string? ProtocolVersion = null,
    string? DpsPowerKey = null,
    string? ClientKey = null,
    bool? SupportsColor = null
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

        // Troca de protocolo (IntegrationType) reconstrói Configuration do
        // zero na categoria certa (TuyaDeviceConfiguration/
        // MqttDeviceConfiguration/NetworkDeviceConfiguration) como parte
        // atômica de Device.ChangeIntegrationType — os campos da categoria
        // antiga não fazem sentido pra nova, então não são preservados.
        // Reaplicados abaixo os que o request trouxer.
        device.ChangeIntegrationType(request.IntegrationType);

        device.RoomId = request.RoomId;

        // Atualiza a configuração aninhada apenas quando um novo valor é
        // informado — o GET nunca devolve estes campos ao frontend, então
        // "vazio" aqui significa "preservar o que já está salvo", não "apagar".
        if (!string.IsNullOrWhiteSpace(request.IpAddress))
            device.Configuration.IpAddress = request.IpAddress;

        if (
            device.Configuration is INetworkAddressableConfiguration networkConfiguration
            && !string.IsNullOrWhiteSpace(request.MacAddress)
        )
            networkConfiguration.MacAddress = request.MacAddress;

        if (device.Configuration is TuyaDeviceConfiguration tuyaConfiguration)
        {
            if (!string.IsNullOrWhiteSpace(request.LocalKey))
                tuyaConfiguration.LocalKey = request.LocalKey;

            if (!string.IsNullOrWhiteSpace(request.ProtocolVersion))
                tuyaConfiguration.ProtocolVersion = request.ProtocolVersion;

            if (!string.IsNullOrWhiteSpace(request.DpsPowerKey))
                tuyaConfiguration.DpsPowerKey = request.DpsPowerKey;

            // Ao contrário dos campos de string acima (onde "vazio" = preservar,
            // já que o GET nunca devolve segredos como LocalKey/ClientKey), o
            // formulário de edição sempre recebe e reenvia o tri-state atual de
            // SupportsColor (via DeviceDto.SupportsColorOverride) — não é um campo
            // sensível omitido do GET, então null aqui é uma escolha real do
            // usuário ("voltar pra detecção automática"), não "campo não enviado".
            tuyaConfiguration.SupportsColor = request.SupportsColor;
        }

        if (
            device.Configuration is MqttDeviceConfiguration mqttConfiguration
            && !string.IsNullOrWhiteSpace(request.ClientKey)
        )
            mqttConfiguration.ClientKey = request.ClientKey;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
