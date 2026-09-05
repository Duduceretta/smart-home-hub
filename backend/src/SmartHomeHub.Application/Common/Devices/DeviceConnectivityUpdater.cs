using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Common.Devices;

// Lógica de "aplicar mudança de conectividade" compartilhada entre os dois
// caminhos que marcam um dispositivo online/offline: DeviceHealthCheckWorker
// (polling de rede, ~12s de atraso, rede de segurança pra firmware que não
// publica LWT) e ProcessDeviceLwtCommand (LWT individual via MQTT, quase
// instantâneo pra hardware nativo Sonoff/Tasmota/ESPHome). Nunca duplicar
// esta lógica — os dois devem chamar este método.
public static class DeviceConnectivityUpdater
{
    // Aplica em memória (LiveState + SystemEvent), sem SaveChangesAsync — quem
    // chama decide quando persistir (o health check faz isso em lote pra
    // vários dispositivos de uma vez; o LWT persiste um só por vez). Devolve
    // false se o dispositivo já estava no estado pedido — idempotente, pra um
    // LWT repetido ou uma leitura de probe que não mudou nada não gerar
    // SystemEvent duplicado.
    public static bool ApplyConnectivityChange(
        IAppDbContext dbContext,
        Device device,
        bool isOnline
    )
    {
        var liveState = device.LiveState;
        if (liveState == null)
        {
            liveState = new DeviceLiveState
            {
                DeviceId = device.Id,
                IsOn = false,
                IsOnline = false,
                LastSeenAt = null,
                Attributes = new DeviceLiveStateAttributes(),
            };
            device.LiveState = liveState;
            dbContext.DeviceLiveStates.Add(liveState);
        }

        if (liveState.IsOnline == isOnline)
        {
            return false;
        }

        liveState.IsOnline = isOnline;
        if (isOnline)
        {
            liveState.LastSeenAt = DateTimeOffset.UtcNow;
        }

        var (title, description) = ActivityLogMessages.DeviceConnectivityChanged(
            device.Name,
            device.Room?.Name,
            isOnline
        );

        dbContext.SystemEvents.Add(
            new SystemEvent
            {
                UserId = device.UserId,
                DeviceId = device.Id,
                EventType = isOnline
                    ? SystemEventTypes.DeviceOnline
                    : SystemEventTypes.DeviceOffline,
                Title = title,
                Description = description,
                Severity = isOnline ? EventSeverity.Info : EventSeverity.Warning,
                Source = EventSource.System,
                DeviceName = device.Name,
                RoomId = device.RoomId,
                RoomName = device.Room?.Name,
                OldValue = isOnline ? "offline" : "online",
                NewValue = isOnline ? "online" : "offline",
                IsAlert = !isOnline,
                Timestamp = DateTimeOffset.UtcNow,
            }
        );

        return true;
    }
}
