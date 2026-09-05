using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Devices;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Telemetry.Commands.ProcessDeviceLwt;

// Tópico: home/status/{externalId} — convenção própria do projeto (mesmo
// esquema de home/telemetry/{externalId} e home/commands/{externalId}, ver
// CLAUDE.md), não o default de fábrica do Tasmota (tele/%topic%/LWT). Nenhum
// hardware real estava provisionado no momento desta implementação — quando
// dispositivos Tasmota/ESPHome reais forem configurados, o FullTopic/config
// MQTT precisa publicar o LWT individual nesse tópico pra este caminho
// funcionar (ver iot-drivers.md, seção sobre LWT individual).
public record ProcessDeviceLwtCommand(string Topic, string Payload) : ICommand<Result>;

public class ProcessDeviceLwtCommandHandler(
    IAppDbContext dbContext,
    IRealtimeNotificationService notificationService
) : ICommandHandler<ProcessDeviceLwtCommand, Result>
{
    public async ValueTask<Result> Handle(
        ProcessDeviceLwtCommand request,
        CancellationToken cancellationToken
    )
    {
        var topicParts = request.Topic.Split('/');

        if (topicParts.Length != 3 || topicParts[0] != "home" || topicParts[1] != "status")
        {
            return Result.Failure(new Error("Mqtt.InvalidTopic", "Formato de tópico ignorado."));
        }

        var externalId = topicParts[2];
        var payload = request.Payload.Trim();

        // Tasmota/ESPHome publicam LWT como texto puro "Online"/"Offline", não
        // JSON — comparação case-insensitive porque a convenção varia por
        // firmware/config (algumas instalações publicam em minúsculas).
        bool isOnline;
        if (string.Equals(payload, "Online", StringComparison.OrdinalIgnoreCase))
        {
            isOnline = true;
        }
        else if (string.Equals(payload, "Offline", StringComparison.OrdinalIgnoreCase))
        {
            isOnline = false;
        }
        else
        {
            return Result.Failure(
                new Error(
                    "Lwt.InvalidPayload",
                    "Payload de LWT não reconhecido (esperado 'Online'/'Offline')."
                )
            );
        }

        var device = await dbContext
            .Devices.Include(device => device.User)
            .Include(device => device.Room)
            .Include(device => device.LiveState)
            .FirstOrDefaultAsync(device => device.ExternalId == externalId, cancellationToken);

        if (device == null)
        {
            return Result.Failure(
                new Error("Device.NotFound", "Dispositivo não registrado no Hub.")
            );
        }

        var changed = DeviceConnectivityUpdater.ApplyConnectivityChange(
            dbContext,
            device,
            isOnline
        );
        if (!changed)
        {
            // Idempotente: LWT repetido ou já sincronizado por outro caminho
            // (ex: telemetria recém-chegada já marcou online) — nada a fazer.
            return Result.Success();
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.NotifyDeviceStatusChangedAsync(
            device.User.ExternalAuthUid,
            device.Id,
            device.LiveState!.IsOn,
            isOnline,
            cancellationToken
        );

        return Result.Success();
    }
}
