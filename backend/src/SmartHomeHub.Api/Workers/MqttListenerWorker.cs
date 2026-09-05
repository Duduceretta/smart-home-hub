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

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        // CancellationToken.None: o shutdown gracioso do MqttService (esperar o
        // supervisor parar, desconectar do broker) precisa rodar mesmo que o
        // token de shutdown do host já esteja cancelado nesse ponto — ele tem
        // seu próprio timeout interno (StopTimeout) pra não travar o processo.
        await mqttService.StopAsync(CancellationToken.None);
        await base.StopAsync(cancellationToken);
    }
}
