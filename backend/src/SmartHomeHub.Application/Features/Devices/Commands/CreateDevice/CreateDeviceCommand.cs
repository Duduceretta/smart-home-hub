using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;

public record CreateDeviceCommand(
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
) : ICommand<Result<Guid>>;

public class CreateDeviceCommandValidator : AbstractValidator<CreateDeviceCommand>
{
    public CreateDeviceCommandValidator()
    {
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

public class CreateDeviceCommandHandler(
    IAppDbContext dbContext,
    IDeviceProbeService probeService,
    IGoogleTvService googleTvService
) : ICommandHandler<CreateDeviceCommand, Result<Guid>>
{
    public async ValueTask<Result<Guid>> Handle(
        CreateDeviceCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(
            user => user.ExternalAuthUid == request.FirebaseUid,
            cancellationToken
        );

        if (user == null)
            return Result.Failure<Guid>(
                new Error("User.NotFound", "Usuário não encontrado no sistema.")
            );

        if (request.RoomId.HasValue)
        {
            var roomExists = await dbContext.Rooms.AnyAsync(
                room => room.Id == request.RoomId.Value && room.UserId == user.Id,
                cancellationToken
            );

            if (!roomExists)
                return Result.Failure<Guid>(
                    new Error(
                        "Room.NotFound",
                        "Ambiente não encontrado ou sem permissão de acesso."
                    )
                );
        }

        var configuration = DeviceConfigurationTypeResolver.CreateDefault(request.IntegrationType);
        configuration.IpAddress = request.IpAddress;

        if (configuration is INetworkAddressableConfiguration networkConfiguration)
            networkConfiguration.MacAddress = request.MacAddress;

        if (configuration is TuyaDeviceConfiguration tuyaConfiguration)
        {
            tuyaConfiguration.LocalKey = request.LocalKey;
            tuyaConfiguration.ProtocolVersion = request.ProtocolVersion;
            tuyaConfiguration.DpsPowerKey = request.DpsPowerKey ?? "20";
            tuyaConfiguration.SupportsColor = request.SupportsColor;
        }

        if (configuration is MqttDeviceConfiguration mqttConfiguration)
            mqttConfiguration.ClientKey = request.ClientKey;

        var device = new Device
        {
            Name = request.Name,
            Brand = request.Brand,
            ExternalId = request.ExternalId,
            Type = request.Type,
            IntegrationType = request.IntegrationType,
            RoomId = request.RoomId,
            UserId = user.Id,
            Configuration = configuration,
        };

        var isOnline = false;
        DateTimeOffset? lastSeenAt = null;

        if (
            !string.IsNullOrWhiteSpace(device.Configuration.IpAddress)
            && device.IntegrationType.IsNetworkProbeable()
        )
        {
            isOnline = await probeService.ProbeDeviceAsync(
                device.Configuration.IpAddress,
                device.IntegrationType,
                cancellationToken
            );

            if (isOnline)
            {
                lastSeenAt = DateTimeOffset.UtcNow;
            }
        }

        var isOn = false;
        if (
            device.Type == DeviceType.Television
            && !string.IsNullOrWhiteSpace(device.Configuration.IpAddress)
        )
        {
            isOn = await googleTvService.GetPowerStateAsync(
                device.Configuration.IpAddress,
                cancellationToken
            );
        }

        var liveState = new DeviceLiveState
        {
            DeviceId = device.Id,
            IsOn = isOn,
            IsOnline = isOnline,
            LastSeenAt = lastSeenAt,
        };
        device.LiveState = liveState;

        dbContext.Devices.Add(device);
        dbContext.DeviceLiveStates.Add(liveState);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(device.Id);
    }
}
