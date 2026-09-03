using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using MQTTnet;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.Infrastructure.Discovery.Scanners;

public sealed class MqttDiscoveryScanner(ILogger<MqttDiscoveryScanner> logger)
    : IDeviceDiscoveryScanner
{
    private static readonly string[] DiscoveryTopicFilters =
    [
        "homeassistant/+/+/config",
        "homeassistant/+/+/+/config",
        "esphome/discover/#",
    ];

    public IntegrationType IntegrationType => IntegrationType.EspHomeMqtt;

    public async IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        var mqttFactory = new MqttClientFactory();
        using var client = mqttFactory.CreateMqttClient();

        var channel = Channel.CreateUnbounded<DiscoveredDeviceDto>();

        client.ApplicationMessageReceivedAsync += e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = e.ApplicationMessage.ConvertPayloadToString() ?? string.Empty;

            var parsed = MqttDiscoveryPayloadParser.TryParse(topic, payload);

            if (parsed is not null)
            {
                channel.Writer.TryWrite(parsed);
            }

            return Task.CompletedTask;
        };

        var options = new MqttClientOptionsBuilder()
            .WithClientId($"SmartHomeHub_Discovery_{Guid.NewGuid():N}")
            .WithTcpServer("localhost", 1883)
            .WithCleanStart()
            .Build();

        try
        {
            await client.ConnectAsync(options, cancellationToken);

            var subscribeOptions = new MqttClientSubscribeOptionsBuilder();
            foreach (var filter in DiscoveryTopicFilters)
            {
                subscribeOptions.WithTopicFilter(f => f.WithTopic(filter));
            }

            await client.SubscribeAsync(subscribeOptions.Build(), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Falha ao conectar cliente MQTT de descoberta.");
            yield break;
        }

        using var registration = cancellationToken.Register(() => channel.Writer.TryComplete());

        await foreach (var discovered in channel.Reader.ReadAllAsync(cancellationToken))
        {
            yield return discovered;
        }

        if (client.IsConnected)
        {
            await client.DisconnectAsync(cancellationToken: CancellationToken.None);
        }
    }
}
