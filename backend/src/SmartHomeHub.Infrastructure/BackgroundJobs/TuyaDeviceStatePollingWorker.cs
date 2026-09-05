using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Devices;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

// Sincroniza mudanças de estado EXTERNAS (interruptor físico, app SmartLife)
// em dispositivos Tuya locais — nenhum mecanismo existente detecta isso hoje.
// Investigado e descartado antes de chegar neste desenho: UDP broadcast não
// carrega `dps` (payload idêntico entre estados), e push espontâneo via
// sessão TCP persistente não cobre o caso mais comum (interruptor físico) —
// ver backend/docs/iot-drivers.md, seção "Driver Local Tuya (TCP)",
// investigação de push local. Polling puro reaproveitando QueryStatusAsync é
// a única via local que sobrou. Este worker é ADICIONAL ao
// DeviceHealthCheckWorker (continua sendo a rede de segurança de
// conectividade pra todo tipo de dispositivo, não só Tuya).
//
// Cobre TODOS os atributos relevantes (power + brilho/cor/temp. de cor), não
// só power — o interruptor físico só afeta power, mas o app SmartLife pode
// mudar qualquer atributo de uma lâmpada por fora, sem passar por nenhum
// comando nosso.
public sealed class TuyaDeviceStatePollingWorker(
    IServiceScopeFactory scopeFactory,
    ITuyaLocalControlService tuyaLocalControlService,
    ILogger<TuyaDeviceStatePollingWorker> logger
) : BackgroundService
{
    // 12s — mesmo intervalo do DeviceHealthCheckWorker, dentro da janela
    // 10-15s pedida: rápido o bastante pra uma mudança externa (interruptor
    // físico) aparecer na UI em tempo "responsivo" sem o usuário perceber
    // atraso perceptível, mas não tão agressivo a ponto de virar handshake TCP
    // completo (3 vias) + QueryStatusAsync por dispositivo Tuya rápido demais
    // pra um microcontrolador frágil aguentar em cima do que a coalescência de
    // escrita (seção 5.3) já tenta poupar. Mesma cadência do health check
    // também simplifica o raciocínio sobre latência total do sistema — não
    // introduz um terceiro intervalo diferente pra decorar.
    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(12);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "Iniciando o worker de sondagem de estado de dispositivos Tuya locais..."
        );

        using var timer = new PeriodicTimer(PollingInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await RunPollingCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Ciclo de sondagem de estado de dispositivos Tuya falhou de forma inesperada."
                    );
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation(
                "Desligando o worker de sondagem de estado de dispositivos Tuya de forma segura..."
            );
        }
    }

    public async Task RunPollingCycleAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var notificationService =
            scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();

        // Configuration.LocalKey não é traduzível pro SQL (propriedade
        // escalar convertida via ValueConverter para jsonb — ver
        // backend/docs/architecture.md) — filtrado em memória após o
        // Where(IntegrationType) traduzível.
        var candidates = await dbContext
            .Devices.Include(device => device.User)
            .Include(device => device.Room)
            .Include(device => device.LiveState)
            .Where(device => device.IntegrationType == IntegrationType.TuyaLocal)
            .ToListAsync(cancellationToken);

        var pollable = candidates
            .Where(device =>
                device.User != null
                && device.Configuration is TuyaDeviceConfiguration { LocalKey: not null }
            )
            .ToList();

        if (pollable.Count == 0)
        {
            return;
        }

        // Paralelo entre dispositivos DIFERENTES — cada QueryStatusAsync abre
        // seu próprio socket contra um IP diferente; um device lento/offline
        // (até o timeout de rede) não pode atrasar a consulta dos demais no
        // mesmo ciclo. Dentro do MESMO dispositivo, GetStateForPollingAsync já
        // serializa via o semáforo compartilhado com o caminho de escrita.
        var pollResults = await Task.WhenAll(
            pollable.Select(async device =>
            {
                if (device.Configuration is not TuyaDeviceConfiguration tuyaConfig)
                    throw new InvalidOperationException(
                        $"Dispositivo {device.Id} tem IntegrationType=TuyaLocal mas Configuration é {device.Configuration.GetType().Name}."
                    );

                var connection = new TuyaDeviceConnectionInfo(
                    device.ExternalId,
                    tuyaConfig.LocalKey!,
                    tuyaConfig.IpAddress,
                    tuyaConfig.DpsPowerKey,
                    tuyaConfig.ProtocolVersion,
                    tuyaConfig.DpsBrightnessKey,
                    tuyaConfig.DpsColorKey,
                    tuyaConfig.DpsColorTempKey
                );

                var result = await tuyaLocalControlService.GetStateForPollingAsync(
                    connection,
                    cancellationToken
                );

                return (Device: device, Result: result);
            })
        );

        var changed = new List<Device>();

        foreach (var (device, result) in pollResults)
        {
            if (result.IsFailure)
            {
                if (result.Error.Code == "Device.Busy")
                {
                    // Comando de usuário em andamento no mesmo dispositivo (semáforo
                    // ocupado) — pula este ciclo silenciosamente, sem marcar offline
                    // nem logar como erro. Há um próximo ciclo em ~12s; a escrita do
                    // usuário sempre tem prioridade sobre esta leitura de rotina.
                    continue;
                }

                // Qualquer outra falha (timeout de rede, IP não localizado — respeita
                // o circuit breaker de resolução de IP já existente, sem forçar
                // broadcast UDP extra — ou DP de liga/desliga ausente) é tratada como
                // "dispositivo fora do ar", reaproveitando o MESMO caminho de
                // DeviceHealthCheckWorker/LWT — nunca duplicar essa lógica.
                if (
                    DeviceConnectivityUpdater.ApplyConnectivityChange(
                        dbContext,
                        device,
                        isOnline: false
                    )
                )
                {
                    changed.Add(device);
                }

                continue;
            }

            var outcome = result.Value;

            if (outcome.ResolvedIpAddress is not null)
            {
                device.Configuration.IpAddress = outcome.ResolvedIpAddress;
            }

            if (
                outcome.ResolvedDpsPowerKey is not null
                && device.Configuration is TuyaDeviceConfiguration tuyaConfig
            )
            {
                tuyaConfig.DpsPowerKey = outcome.ResolvedDpsPowerKey;
            }

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

            var wasOn = liveState.IsOn;
            var wasOnline = liveState.IsOnline;

            // Diffing de energia/conectividade — separado do diffing de
            // atributos abaixo porque só esse eixo gera o SystemEvent de
            // "ligado/desligado" (ActivityLogMessages.DeviceStatusChanged);
            // um SystemEvent com esse texto numa mudança pura de brilho/cor
            // seria enganoso (diria "ligado" sem nada ter ligado).
            var powerOrConnectivityChanged = wasOn != outcome.IsOn || !wasOnline;

            // Diffing por atributo — só compara/persiste os campos que a
            // CATEGORIA do dispositivo realmente suporta (Light). Pra outras
            // categorias (ex: Switch/tomada), outcome.BrightnessPercent/
            // ColorHex/ColorTempPercent já vêm null (DP nunca resolveu no
            // driver), então nem entrariam aqui de qualquer forma — o gate
            // por DeviceType é redundante com isso, mas explícito de
            // propósito: não é o driver Tuya (que não conhece DeviceType)
            // quem decide o que é "aplicável", é este worker.
            var attributesChanged = false;

            if (device.Type == DeviceType.Light)
            {
                if (
                    outcome.BrightnessPercent is int brightness
                    && liveState.Attributes.Brightness != brightness
                )
                {
                    liveState.Attributes.Brightness = brightness;
                    attributesChanged = true;
                }

                if (
                    outcome.ColorHex is string colorHex
                    && !string.Equals(
                        liveState.Attributes.ColorHex,
                        colorHex,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    liveState.Attributes.ColorHex = colorHex;
                    attributesChanged = true;
                }

                if (
                    outcome.ColorTempPercent is int colorTempPercent
                    && liveState.Attributes.ColorTempPercent != colorTempPercent
                )
                {
                    liveState.Attributes.ColorTempPercent = colorTempPercent;
                    attributesChanged = true;
                }
            }

            // Diffing antes de persistir/emitir: só escreve e notifica se algo
            // realmente mudou (energia, conectividade OU qualquer atributo).
            // Sem isso, todo ciclo de ~12s geraria escrita/evento redundante
            // por dispositivo Tuya, poluindo a linha do tempo mesmo sem
            // nenhuma mudança real — exatamente o ruído que o diffing evita.
            if (!powerOrConnectivityChanged && !attributesChanged)
            {
                continue;
            }

            liveState.IsOn = outcome.IsOn;
            liveState.IsOnline = true;
            liveState.LastSeenAt = DateTimeOffset.UtcNow;

            if (powerOrConnectivityChanged)
            {
                var (title, description) = ActivityLogMessages.DeviceStatusChanged(
                    device.Name,
                    device.Room?.Name,
                    liveState.IsOn,
                    liveState.IsOnline
                );

                dbContext.SystemEvents.Add(
                    new SystemEvent
                    {
                        UserId = device.UserId,
                        DeviceId = device.Id,
                        EventType = SystemEventTypes.StateChange,
                        Title = title,
                        Description = description,
                        Severity = EventSeverity.Info,
                        Source = EventSource.System,
                        DeviceName = device.Name,
                        RoomId = device.RoomId,
                        RoomName = device.Room?.Name,
                        OldValue =
                            !wasOnline ? "offline"
                            : wasOn ? "on"
                            : "off",
                        NewValue = liveState.IsOn ? "on" : "off",
                        IsAlert = false,
                        Timestamp = DateTimeOffset.UtcNow,
                    }
                );
            }

            changed.Add(device);
        }

        if (changed.Count == 0)
        {
            return;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var device in changed)
        {
            var liveState = device.LiveState!;
            logger.LogInformation(
                "Dispositivo Tuya {DeviceId} sincronizado via polling: on={IsOn} online={IsOnline} brightness={Brightness} colorHex={ColorHex} colorTempPercent={ColorTempPercent}",
                device.Id,
                liveState.IsOn,
                liveState.IsOnline,
                liveState.Attributes.Brightness,
                liveState.Attributes.ColorHex,
                liveState.Attributes.ColorTempPercent
            );

            // O payload do evento (isOn/isOnline) sempre reflete o estado ATUAL
            // e correto do dispositivo, mesmo quando o que mudou de fato foi só
            // um atributo (brilho/cor/temp.) — o front-end reage a este evento
            // buscando o shadow completo do dispositivo (Attributes incluso),
            // não só os dois campos deste payload; disparar aqui em qualquer
            // mudança de atributo é o que garante que outros clientes
            // conectados vejam a mudança externa, não só a de power.
            await notificationService.NotifyDeviceStatusChangedAsync(
                device.User.ExternalAuthUid,
                device.Id,
                liveState.IsOn,
                liveState.IsOnline,
                cancellationToken
            );
        }
    }
}
