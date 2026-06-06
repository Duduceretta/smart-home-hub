namespace SmartHomeHub.Application.Common.Interfaces;

public interface IMqttService
{
    Task StartAsync(CancellationToken cancellationToken);
    Task PublishAsync(string topic, string payload);
}