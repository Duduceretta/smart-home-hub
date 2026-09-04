using Mediator;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MQTTnet;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;

namespace SmartHomeHub.Infrastructure.Messaging;

public sealed class MqttService(
    ILogger<MqttService> logger,
    IServiceScopeFactory scopeFactory,
    // Seam de teste: retry/restart mais curto, pra não deixar o teste do
    // supervisor esperando 5s de verdade. Produção usa o default.
    TimeSpan? retryDelayForTests = null
) : IMqttService
{
    // Cadência tanto do polling de reconexão quanto do restart do supervisor
    // após uma morte inesperada da tarefa de manutenção — não há motivo pra
    // esses dois valores divergirem, os dois são "tenta de novo em breve".
    private readonly TimeSpan _retryDelay = retryDelayForTests ?? TimeSpan.FromSeconds(5);

    private const string BackendStatusTopic = "home/status/backend";

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
            // LWT: o broker publica isso sozinho se a conexão cair sem um
            // desligamento limpo (crash, queda de rede) — sinaliza que o
            // BACKEND caiu, não detecção de dispositivo MQTT individual (esse
            // gap fica registrado à parte, exigiria LWT por dispositivo).
            .WithWillTopic(BackendStatusTopic)
            .WithWillPayload("offline")
            .WithWillRetain(true)
            .Build();

        ConfigureEvents(_client);

        _ = Task.Run(
            () =>
                RunSupervisedAsync(
                    MaintainConnectionAsync,
                    "Loop de manutenção de conexão MQTT",
                    cancellationToken
                ),
            cancellationToken
        );

        return Task.CompletedTask;
    }

    public async Task PublishAsync(
        string topic,
        string payload,
        CancellationToken cancellationToken
    )
    {
        if (_client is { IsConnected: true })
        {
            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(payload)
                .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _client.PublishAsync(message, cancellationToken);

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

    // Supervisor genérico: se `work` morrer por uma exceção não prevista (não
    // o cancelamento normal de shutdown), loga como CRÍTICO — isso precisa
    // aparecer nos logs, não um Warning que passa despercebido — e reinicia
    // `work` do zero em vez de deixar a tarefa morrer de vez em silêncio. Sem
    // isso, um bug futuro no loop de manutenção apagaria silenciosamente todo
    // o canal MQTT (hardware nativo Sonoff/Tasmota/ESPHome) até alguém notar
    // manualmente. Público (não `internal`) pelo mesmo motivo que o resto do
    // driver expõe métodos testáveis direto na classe concreta, sem exigir
    // InternalsVisibleTo.
    public async Task RunSupervisedAsync(
        Func<CancellationToken, Task> work,
        string operationName,
        CancellationToken cancellationToken
    )
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await work(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Shutdown gracioso — sai do loop pela checagem da condição acima.
            }
            catch (Exception ex)
            {
                logger.LogCritical(
                    ex,
                    "{OperationName} morreu inesperadamente — reiniciando em {DelaySeconds}s.",
                    operationName,
                    _retryDelay.TotalSeconds
                );

                try
                {
                    await Task.Delay(_retryDelay, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    // Shutdown durante o delay de restart — sai do loop.
                }
            }
        }
    }

    // Recebe o client como parâmetro (em vez de fechar sobre o campo `_client`
    // direto) só pra permitir testar a configuração dos handlers (QoS da
    // subscription, etc.) contra um fake, sem depender de conexão de rede real.
    private void ConfigureEvents(IMqttClient client)
    {
        client.ConnectedAsync += async e =>
        {
            logger.LogInformation("Conectado ao broker Mosquitto!");

            var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
                .WithTopicFilter(filter =>
                    filter
                        .WithTopic("home/#")
                        .WithQualityOfServiceLevel(
                            MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce
                        )
                )
                .Build();

            await client.SubscribeAsync(subscribeOptions, CancellationToken.None);

            logger.LogInformation("Inscrito no tópico global 'home/#' com QoS 1");
        };

        client.DisconnectedAsync += e =>
        {
            logger.LogWarning("Conexão com o Mosquitto perdida.");
            return Task.CompletedTask;
        };

        client.ApplicationMessageReceivedAsync += async e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = e.ApplicationMessage.ConvertPayloadToString() ?? string.Empty;

            if (logger.IsEnabled(LogLevel.Information))
            {
                logger.LogInformation(
                    "Sensor Report | Tópico: {Topic} | Dados: {Payload}",
                    topic,
                    payload
                );
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

            await Task.Delay(_retryDelay, cancellationToken);
        }
    }
}
