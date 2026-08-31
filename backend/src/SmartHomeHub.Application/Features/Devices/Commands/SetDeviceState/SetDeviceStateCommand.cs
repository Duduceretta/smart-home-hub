using System.Text.Json;
using System.Text.RegularExpressions;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;

public record SetDeviceStateCommand(
    Guid DeviceId,
    string FirebaseUid,
    bool DesiredState,
    string TraceId,
    EventSource Source = EventSource.UserManual,
    Guid? DeviceGroupId = null,
    string? DeviceGroupName = null
) : ICommand<Result>;

public class SetDeviceStateCommandValidator : AbstractValidator<SetDeviceStateCommand>
{
    public SetDeviceStateCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");
        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
        RuleFor(command => command.TraceId)
            .NotEmpty()
            .WithMessage("O TraceId de correlação é obrigatório.");
    }
}

public partial class SetDeviceStateCommandHandler(
    IAppDbContext dbContext,
    IMqttService mqttService,
    IGoogleTvService googleTvService,
    IChromecastWakeService chromecastWakeService,
    IWakeOnLanService wakeOnLanService,
    ITuyaLocalControlService tuyaLocalControlService,
    IRealtimeNotificationService notificationService
) : ICommandHandler<SetDeviceStateCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetDeviceStateCommand request,
        CancellationToken cancellationToken
    )
    {
        var device = await dbContext
            .Devices.Include(d => d.Room)
            .Include(d => d.User)
            .FirstOrDefaultAsync(
                d => d.Id == request.DeviceId && d.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (device == null)
            return Result.Failure(new Error("Device.NotFound", "Dispositivo não encontrado."));

        // ---------------------------------------------------------
        // PROTEÇÃO DE ESTADO (IDEMPOTÊNCIA) E REDUÇÃO DE DESGASTE FÍSICO
        // ---------------------------------------------------------
        if (device.IsOn == request.DesiredState)
        {
            // O dispositivo já está no estado desejado.
            // Retornamos sucesso imediatamente sem tocar no hardware físico.
            return Result.Success();
        }

        // A partir daqui, a lógica de comunicação de hardware é quase idêntica ao antigo Toggle,
        // mas utilizando request.DesiredState em vez de inverter o valor.

        // Para TuyaLocal, o estado que efetivamente persiste é o confirmado pelo dispositivo
        // via protocolo local — não a intenção do request (item 7: sem confirmação real, sem
        // atualizar como "ligado").
        var confirmedIsOn = request.DesiredState;

        if (device.Type == DeviceType.Television)
        {
            var ipAddress = device.Configuration.IpAddress;

            if (string.IsNullOrEmpty(ipAddress))
                return Result.Failure(
                    new Error("Device.NoIpAddress", "A TV precisa de um IP configurado.")
                );

            if (request.DesiredState) // Ligar TV
            {
                if (IsTvMediaIntegration(device.IntegrationType))
                {
                    var macAddress =
                        device.Configuration.MacAddress
                        ?? (LooksLikeMacAddress(device.ExternalId) ? device.ExternalId : null);
                    if (macAddress is not null)
                    {
                        await wakeOnLanService.SendMagicPacketAsync(macAddress, cancellationToken);
                        await Task.Delay(2500, cancellationToken);
                    }
                }

                var wokeUpViaAdb =
                    device.IntegrationType.IsAdbControllable()
                    && await TryWakeUpViaAdbAsync(ipAddress, cancellationToken);

                if (!wokeUpViaAdb)
                {
                    try
                    {
                        await chromecastWakeService.WakeUpAsync(ipAddress, cancellationToken);
                    }
                    catch
                    { /* best-effort fallback */
                    }
                }
            }
            else // Desligar TV
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
        else if (device.IntegrationType == IntegrationType.TuyaLocal)
        {
            if (string.IsNullOrWhiteSpace(device.Configuration.LocalKey))
            {
                return Result.Failure(
                    new Error(
                        "Device.MissingConfiguration",
                        "O dispositivo Tuya não tem local_key configurada."
                    )
                );
            }

            var connection = new TuyaDeviceConnectionInfo(
                device.ExternalId,
                device.Configuration.LocalKey,
                device.Configuration.IpAddress,
                device.Configuration.DpsPowerKey,
                device.Configuration.ProtocolVersion
            );

            var tuyaResult = await tuyaLocalControlService.SetPowerStateAsync(
                connection,
                request.DesiredState,
                cancellationToken
            );

            if (tuyaResult.IsFailure)
            {
                if (tuyaResult.Error.Code == "Device.Offline")
                {
                    device.IsOnline = false;
                    await dbContext.SaveChangesAsync(cancellationToken);
                    await notificationService.NotifyDeviceStatusChangedAsync(
                        request.FirebaseUid,
                        device.Id,
                        device.IsOn,
                        device.IsOnline,
                        cancellationToken
                    );
                }

                return Result.Failure(tuyaResult.Error);
            }

            var outcome = tuyaResult.Value;
            confirmedIsOn = outcome.ConfirmedIsOn;

            if (outcome.ResolvedIpAddress is not null)
                device.Configuration.IpAddress = outcome.ResolvedIpAddress;

            if (outcome.ResolvedDpsPowerKey is not null)
                device.Configuration.DpsPowerKey = outcome.ResolvedDpsPowerKey;

            device.IsOnline = true;
            device.LastSeenAt = DateTimeOffset.UtcNow;
        }
        else // Outros hardwares via MQTT
        {
            var commandPayload = JsonSerializer.Serialize(
                new { action = request.DesiredState ? "turn_on" : "turn_off" }
            );
            var topic = $"casa/comandos/{device.ExternalId}";
            await mqttService.PublishAsync(topic, commandPayload);
        }

        // Atualiza estado e salva evento com snapshot completo
        var previousState = device.IsOn;
        device.IsOn = confirmedIsOn;

        var (title, description) = ActivityLogMessages.DevicePowerStateChanged(
            device.Name,
            device.Room?.Name,
            device.IsOn
        );

        dbContext.SystemEvents.Add(
            new SystemEvent
            {
                UserId = device.UserId,
                DeviceId = device.Id,
                EventType = ActivityEventTypes.StateChange,
                Title = title,
                Description = description,
                Severity = EventSeverity.Info,
                Source = request.Source,
                DeviceName = device.Name,
                RoomId = device.RoomId,
                RoomName = device.Room?.Name,
                DeviceGroupId = request.DeviceGroupId,
                DeviceGroupName = request.DeviceGroupName,
                OldValue = previousState ? "on" : "off",
                NewValue = confirmedIsOn ? "on" : "off",
                IsAlert = false,
                Timestamp = DateTimeOffset.UtcNow,
            }
        );

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

    // Métodos auxiliares de hardware (mesmos do ToggleDeviceCommand)
    private static bool IsTvMediaIntegration(IntegrationType type) =>
        type
            is IntegrationType.GoogleCast
                or IntegrationType.AndroidTvAdb
                or IntegrationType.LgWebOs;

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
                catch { }
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
