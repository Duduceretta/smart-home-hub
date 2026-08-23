using System.Text.Json;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Api.Workers;

public sealed class MockTelemetryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<MockTelemetryWorker> logger
) : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Iniciando o worker de Telemetria Mock...");

        using var timer = new PeriodicTimer(TickInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await RunTelemetryCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Ciclo de Telemetria Mock falhou de forma inesperada.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Desligando o worker de Telemetria Mock de forma segura...");
        }
    }

    private async Task RunTelemetryCycleAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var devices = await dbContext
            .Devices.Where(device =>
                device.IntegrationType == IntegrationType.NativeMqtt && !device.IsDeleted
            )
            .ToListAsync(cancellationToken);

        foreach (var device in devices)
        {
            var payload = BuildMockPayload(device);
            var topic = $"home/telemetry/{device.ExternalId}";

            await mediator.Send(
                new ProcessTelemetryCommand(topic, JsonSerializer.Serialize(payload)),
                cancellationToken
            );
        }
    }

    private static TelemetryPayload BuildMockPayload(Device device)
    {
        return device.Type switch
        {
            DeviceType.Light or DeviceType.Switch => new TelemetryPayload(
                IsOn: device.IsOn,
                Voltage: 220,
                SignalStrength: "strong",
                PowerUsageWatts: Random.Shared.Next(5, 61),
                TemperatureCelsius: null
            ),
            DeviceType.Sensor or DeviceType.Thermostat => new TelemetryPayload(
                IsOn: device.IsOn,
                Voltage: null,
                SignalStrength: "strong",
                PowerUsageWatts: null,
                TemperatureCelsius: Math.Round(18 + Random.Shared.NextDouble() * 10, 1)
            ),
            DeviceType.Television => new TelemetryPayload(
                IsOn: device.IsOn,
                Voltage: 220,
                SignalStrength: "strong",
                PowerUsageWatts: Random.Shared.Next(80, 151),
                TemperatureCelsius: null
            ),
            _ => new TelemetryPayload(
                IsOn: device.IsOn,
                Voltage: null,
                SignalStrength: "strong",
                PowerUsageWatts: null,
                TemperatureCelsius: null
            ),
        };
    }
}
