using System.Text.Json;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common;

namespace SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;

public record ProcessTelemetryCommand(string Topic, string Payload) : ICommand<Result>;

public record TelemetryPayload(bool IsOn, int Voltage, string SignalStrength);

public class ProcessTelemetryCommandHandler(IAppDbContext dbContext) : ICommandHandler<ProcessTelemetryCommand, Result>
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async ValueTask<Result> Handle(ProcessTelemetryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var topicParts = request.Topic.Split('/');
            
            if (topicParts.Length != 3 || topicParts[0] != "home" || topicParts[1] != "telemetry")
            {
                return Result.Failure(new Error("Mqtt.InvalidTopic", "Formato de tópico ignorado."));
            }

            var externalId = topicParts[2];

            var telemetry = JsonSerializer.Deserialize<TelemetryPayload>(
                request.Payload, 
                _jsonOptions);

            if (telemetry == null)
                return Result.Failure(new Error("Telemetry.Invalid", "Payload vazio ou corrompido."));

            var device = await dbContext.Devices
                .FirstOrDefaultAsync(device => device.ExternalId == externalId, cancellationToken);

            if (device == null)
            {
                return Result.Failure(new Error("Device.NotFound", "Dispositivo não registrado no Hub."));
            }

            device.IsOn = telemetry.IsOn;

            // TODO Futuro: Aqui também salvaríamos o voltage e o sinal no TimescaleDB!

            await dbContext.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
        catch (JsonException)
        {
            return Result.Failure(new Error("Telemetry.ParseError", "Falha ao ler o JSON do dispositivo."));
        }
    }
}