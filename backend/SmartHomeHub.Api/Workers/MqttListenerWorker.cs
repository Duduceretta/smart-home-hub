using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Api.Workers;

public sealed class MqttListenerWorker(IMqttService mqttService, ILogger<MqttListenerWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Iniciando o motor do MQTT Service...");

        await mqttService.StartAsync(stoppingToken);

        try
        {
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            logger.LogInformation("Desligando o motor MQTT de forma segura...");
        }
    }
}
