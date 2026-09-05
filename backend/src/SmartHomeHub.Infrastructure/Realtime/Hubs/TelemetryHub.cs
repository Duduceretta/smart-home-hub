using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.DeviceGroups.Commands.SetDeviceGroupBrightness;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceBrightness;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceColor;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceColorTemp;

namespace SmartHomeHub.Infrastructure.Realtime.Hubs;

[Authorize]
public class TelemetryHub : Hub
{
    public async Task StartDiscovery(int timeoutSeconds, IDeviceDiscoveryManager discoveryManager)
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (string.IsNullOrEmpty(firebaseUid))
        {
            return;
        }

        await discoveryManager.StartDiscoveryAsync(
            firebaseUid,
            timeoutSeconds,
            Context.ConnectionAborted
        );
    }

    public async Task StopDiscovery(IDeviceDiscoveryManager discoveryManager)
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (string.IsNullOrEmpty(firebaseUid))
        {
            return;
        }

        await discoveryManager.StopDiscoveryAsync(firebaseUid);
    }

    public override async Task OnConnectedAsync()
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (!string.IsNullOrEmpty(firebaseUid))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{firebaseUid}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;

        if (!string.IsNullOrEmpty(firebaseUid))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{firebaseUid}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Preview em tempo real durante o arraste do slider de brilho de UM
    /// dispositivo — throttled no cliente (80-100ms), complementar ao commit
    /// final via REST em onPointerUp/onChangeEnd (rede de segurança, nunca
    /// substituída). Flui pelo MESMO <see cref="SetDeviceBrightnessCommand"/>
    /// usado pelo commit final — não existe caminho de escrita paralelo pro
    /// hardware; a coalescência last-value-wins de 75ms do driver Tuya
    /// (<c>TuyaLightCommandCoalescer</c>) absorve a rajada do lado do
    /// hardware, complementar ao throttle do cliente (que já reduz o volume
    /// ANTES de chegar aqui). Ver backend/docs/architecture.md, seção
    /// "SignalR / Hub".
    ///
    /// O espelhamento pros DEMAIS clientes conectados (<c>OthersInGroup</c>,
    /// nunca o próprio remetente) acontece ANTES de esperar o resultado do
    /// comando — é só eco visual da posição do slider sendo arrastado, não
    /// confirmação de hardware. Falhas do comando (esperadas, ex:
    /// Device.Busy/Offline, ou inesperadas) nunca são propagadas como erro
    /// disruptivo pro remetente num frame intermediário — o commit final via
    /// REST é quem decide sucesso/falha real.
    /// </summary>
    public async Task PreviewDeviceBrightness(
        Guid deviceId,
        int brightnessPercent,
        ISender sender,
        ILogger<TelemetryHub> logger
    )
    {
        var firebaseUid = GetFirebaseUid();
        if (firebaseUid is null)
            return;

        await Clients
            .OthersInGroup($"user_{firebaseUid}")
            .SendAsync("DeviceControlPreview", new { deviceId, brightnessPercent });

        try
        {
            await sender.Send(
                new SetDeviceBrightnessCommand(deviceId, firebaseUid, brightnessPercent),
                Context.ConnectionAborted
            );
        }
        catch (OperationCanceledException)
        {
            // Cliente desconectou/soltou a conexão no meio do arraste — sem
            // conexão pra responder de qualquer forma, nada a fazer aqui.
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha inesperada ao processar preview de brilho do dispositivo {DeviceId} durante arraste",
                deviceId
            );
        }
    }

    /// <summary>
    /// Mesmo racional de <see cref="PreviewDeviceBrightness"/>, para o
    /// seletor de cor (DP24, aba "Cor" da roda de cores).
    /// </summary>
    public async Task PreviewDeviceColor(
        Guid deviceId,
        string colorHex,
        ISender sender,
        ILogger<TelemetryHub> logger
    )
    {
        var firebaseUid = GetFirebaseUid();
        if (firebaseUid is null)
            return;

        await Clients
            .OthersInGroup($"user_{firebaseUid}")
            .SendAsync("DeviceControlPreview", new { deviceId, colorHex });

        try
        {
            await sender.Send(
                new SetDeviceColorCommand(deviceId, firebaseUid, colorHex),
                Context.ConnectionAborted
            );
        }
        catch (OperationCanceledException)
        {
            // Cliente desconectou/soltou a conexão no meio do arraste.
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha inesperada ao processar preview de cor do dispositivo {DeviceId} durante arraste",
                deviceId
            );
        }
    }

    /// <summary>
    /// Mesmo racional de <see cref="PreviewDeviceBrightness"/>, para o
    /// slider de temperatura de cor (DP23, aba "Branco").
    /// </summary>
    public async Task PreviewDeviceColorTemp(
        Guid deviceId,
        int colorTempPercent,
        ISender sender,
        ILogger<TelemetryHub> logger
    )
    {
        var firebaseUid = GetFirebaseUid();
        if (firebaseUid is null)
            return;

        await Clients
            .OthersInGroup($"user_{firebaseUid}")
            .SendAsync("DeviceControlPreview", new { deviceId, colorTempPercent });

        try
        {
            await sender.Send(
                new SetDeviceColorTempCommand(deviceId, firebaseUid, colorTempPercent),
                Context.ConnectionAborted
            );
        }
        catch (OperationCanceledException)
        {
            // Cliente desconectou/soltou a conexão no meio do arraste.
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha inesperada ao processar preview de temperatura de cor do dispositivo {DeviceId} durante arraste",
                deviceId
            );
        }
    }

    /// <summary>
    /// Preview de brilho coletivo durante o arraste do slider mestre de um
    /// grupo de dispositivos (<c>DeviceGroupMasterControl</c>). Reaproveita
    /// <see cref="SetDeviceGroupBrightnessCommand"/> tal como está — o
    /// fan-out paralelo com <c>IServiceScopeFactory</c>/scope isolado por
    /// dispositivo já vive dentro desse handler; o Hub não reimplementa
    /// nada disso, só dispara o mesmo comando usado pelo commit final.
    /// Escopo deliberado: só brilho — hoje é o único controle contínuo que
    /// o slider mestre de grupo expõe (cor/temperatura de cor não têm
    /// controle coletivo na UI nem comando de grupo dedicado ainda).
    /// </summary>
    public async Task PreviewGroupBrightness(
        Guid groupId,
        int brightnessPercent,
        ISender sender,
        ILogger<TelemetryHub> logger
    )
    {
        var firebaseUid = GetFirebaseUid();
        if (firebaseUid is null)
            return;

        await Clients
            .OthersInGroup($"user_{firebaseUid}")
            .SendAsync("GroupControlPreview", new { groupId, brightnessPercent });

        try
        {
            await sender.Send(
                new SetDeviceGroupBrightnessCommand(groupId, firebaseUid, brightnessPercent),
                Context.ConnectionAborted
            );
        }
        catch (OperationCanceledException)
        {
            // Cliente desconectou/soltou a conexão no meio do arraste.
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha inesperada ao processar preview de brilho coletivo do grupo {GroupId} durante arraste",
                groupId
            );
        }
    }

    private string? GetFirebaseUid()
    {
        var firebaseUid = Context.User?.FindFirst("user_id")?.Value;
        return string.IsNullOrEmpty(firebaseUid) ? null : firebaseUid;
    }
}
