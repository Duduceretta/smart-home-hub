using System.Text.Json;
using System.Text.RegularExpressions;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.ToggleDevice;

public record ToggleDeviceCommand(Guid DeviceId, string FirebaseUid) : ICommand<Result>;

public class ToggleDeviceCommandValidator : AbstractValidator<ToggleDeviceCommand>
{
    public ToggleDeviceCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public partial class ToggleDeviceCommandHandler(
    IAppDbContext dbContext,
    IMqttService mqttService,
    IGoogleTvService googleTvService,
    IChromecastWakeService chromecastWakeService,
    IWakeOnLanService wakeOnLanService,
    IRealtimeNotificationService notificationService
) : ICommandHandler<ToggleDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        ToggleDeviceCommand request,
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
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado."));

        var device = await dbContext.Devices.FirstOrDefaultAsync(
            device => device.Id == request.DeviceId && device.UserId == user.Id,
            cancellationToken
        );

        if (device == null)
            return Result.Failure(
                new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão.")
            );

        var newState = !device.IsOn;

        if (device.Type == DeviceType.Television)
        {
            var ipAddress = device.Configuration.IpAddress;

            if (string.IsNullOrEmpty(ipAddress))
                return Result.Failure(
                    new Error(
                        "Device.NoIpAddress",
                        "A TV precisa de um IP configurado para receber comandos."
                    )
                );

            if (newState)
            {
                if (IsTvMediaIntegration(device.IntegrationType))
                {
                    var macAddress =
                        device.Configuration.MacAddress
                        ?? (LooksLikeMacAddress(device.ExternalId) ? device.ExternalId : null);

                    if (macAddress is not null)
                    {
                        await wakeOnLanService.SendMagicPacketAsync(macAddress, cancellationToken);
                        // A pilha de rede do Android leva mais tempo para subir do que o
                        // socket Cast/ADB responder — 1200ms era curto demais e derrubava
                        // o comando seguinte em timeout, deixando a TV travada na tela
                        // vermelha de boot sem receber o keycode de ativação.
                        await Task.Delay(2500, cancellationToken);
                    }
                }

                var wokeUpViaAdb =
                    IsAdbControllable(device.IntegrationType)
                    && await TryWakeUpViaAdbAsync(ipAddress, cancellationToken);

                if (!wokeUpViaAdb)
                {
                    try
                    {
                        await chromecastWakeService.WakeUpAsync(ipAddress, cancellationToken);
                    }
                    catch (Exception)
                    {
                        // Fallback best-effort: a TV já pode ter sido acordada via WoL/ADB
                        // antes deste ponto — um timeout residual do socket Cast aqui não
                        // pode derrubar o fluxo de ligar o dispositivo.
                    }
                }
            }
            else
            {
                try
                {
                    await googleTvService.SendKeycodeAsync(
                        ipAddress,
                        AndroidKeycodes.Power,
                        cancellationToken
                    );
                }
                catch (DeviceCommunicationException ex)
                {
                    return Result.Failure(new Error(ex.Code, ex.Message));
                }
            }
        }
        else
        {
            var commandPayload = JsonSerializer.Serialize(
                new { action = newState ? "turn_on" : "turn_off" }
            );
            var topic = $"casa/comandos/{device.ExternalId}";
            await mqttService.PublishAsync(topic, commandPayload);
        }

        device.IsOn = newState;
        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.NotifyDeviceStatusChangedAsync(
            request.FirebaseUid,
            device.Id,
            device.IsOn,
            device.IsOnline,
            cancellationToken
        );

        return Result.Success();
    }

    private static bool IsTvMediaIntegration(IntegrationType integrationType) =>
        integrationType
            is IntegrationType.GoogleCast
                or IntegrationType.AndroidTvAdb
                or IntegrationType.LgWebOs;

    private static bool IsAdbControllable(IntegrationType integrationType) =>
        integrationType is IntegrationType.GoogleCast or IntegrationType.AndroidTvAdb;

    /// <summary>
    /// Tenta acordar o display via ADB (KEYCODE_WAKEUP), com uma segunda tentativa
    /// após 1s caso o daemon ADB ainda esteja subindo logo após o Wake-on-LAN.
    /// Em caso de sucesso, envia KEYCODE_HOME em seguida para trazer o launcher para
    /// o primeiro plano — falha nesse passo extra não invalida o wake-up já feito.
    /// </summary>
    private async Task<bool> TryWakeUpViaAdbAsync(
        string ipAddress,
        CancellationToken cancellationToken
    )
    {
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            try
            {
                await googleTvService.SendKeycodeAsync(
                    ipAddress,
                    AndroidKeycodes.WakeUp,
                    cancellationToken
                );

                try
                {
                    await googleTvService.SendKeycodeAsync(
                        ipAddress,
                        AndroidKeycodes.Home,
                        cancellationToken
                    );
                }
                catch (DeviceCommunicationException)
                {
                    // O display já acordou — falha ao trazer o launcher não é crítica.
                }

                return true;
            }
            catch (DeviceCommunicationException) when (attempt == 1)
            {
                await Task.Delay(1000, cancellationToken);
            }
            catch (DeviceCommunicationException)
            {
                return false;
            }
        }

        return false;
    }

    private static bool LooksLikeMacAddress(string value) => MacAddressRegex().IsMatch(value);

    [GeneratedRegex("^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")]
    private static partial Regex MacAddressRegex();
}
