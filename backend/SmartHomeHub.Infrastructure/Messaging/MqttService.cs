using Mediator;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MQTTnet;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;

namespace SmartHomeHub.Infrastructure.Messaging;

public sealed class MqttService(ILogger<MqttService> logger, IServiceScopeFactory scopeFactory) : IMqttService
{
    private IMqttClient _client = null!;
    private MqttClientOptions _options = null!;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var mqttFactory = new MqttClientFactory();
        _client = mqttFactory.CreateMqttClient();

        _options = new MqttClientOptionsBuilder()
            .WithClientId("SmartHomeHub_Backend")
            .WithTcpServer("localhost", 1883)
            .WithCleanStart()
            .Build();

        ConfigureEvents();

        _ = Task.Run(() => MaintainConnectionAsync(cancellationToken), cancellationToken);

        return Task.CompletedTask;
    }

    public async Task PublishAsync(string topic, string payload)
    {
        if (_client is { IsConnected: true })
        {
            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(payload)
                .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _client.PublishAsync(message, CancellationToken.None);

            if (logger.IsEnabled(LogLevel.Information))
            {
                logger.LogInformation("Comando publicado: [{Topic}] {Payload}", topic, payload);
            }
        }
        else
        {
            logger.LogWarning("Falha ao publicar. O cliente MQTT está offline.");
        }
    }

    private void ConfigureEvents()
    {
        _client.ConnectedAsync += async e =>
        {
            logger.LogInformation("Conectado ao broker Mosquitto!");

            var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
                .WithTopicFilter(filter => filter.WithTopic("home/#"))
                .Build();

            await _client.SubscribeAsync(subscribeOptions, CancellationToken.None);

            logger.LogInformation("Inscrito no tópico global 'home/#'");
        };

        _client.DisconnectedAsync += e =>
        {
            logger.LogWarning("Conexão com o Mosquitto perdida.");
            return Task.CompletedTask;
        };

        _client.ApplicationMessageReceivedAsync += async e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = e.ApplicationMessage.ConvertPayloadToString() ?? string.Empty;
                
            if (logger.IsEnabled(LogLevel.Information))
            {
                logger.LogInformation("Sensor Report | Tópico: {Topic} | Dados: {Payload}", topic, payload);
            }

            using var scope = scopeFactory.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            var result = await mediator.Send(new ProcessTelemetryCommand(topic, payload));

            if (result.IsFailure && logger.IsEnabled(LogLevel.Debug))
            {
                logger.LogDebug("Telemetria ignorada: {Error}", result.Error.Description);
            }
        };
    }

    private async Task MaintainConnectionAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                if (!await _client.TryPingAsync(cancellationToken))
                {
                    await _client.ConnectAsync(_options, cancellationToken);
                }
            }
            catch (Exception)
            {
                logger.LogWarning("Tentativa de conexão MQTT falhou. Retentando em 5 segundos...");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
        }
    }
}