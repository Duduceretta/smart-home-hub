using System.Text.Json;
using FluentAssertions;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Telemetry.Commands.ProcessTelemetry;

public class ProcessTelemetryTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task ProcessTelemetry_WithValidPayload_ShouldUpdateDeviceState_AndSaveLog()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            ExternalAuthUid = "firebase-token-123",
        };

        var deviceId = Guid.NewGuid();
        var device = new Device
        {
            Id = deviceId,
            UserId = userId,
            Name = "Tomada Inteligente",
            Brand = "Sonoff",
            ExternalId = "MAC-TELEMETRY-1",
            Type = DeviceType.Switch,
            IsOn = false,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var payloadJson = JsonSerializer.Serialize(
            new
            {
                IsOn = true,
                Voltage = 220,
                SignalStrength = "-50dBm",
            }
        );

        var command = new ProcessTelemetryCommand(
            Topic: $"home/telemetry/{device.ExternalId}",
            Payload: payloadJson
        );

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue("A telemetria deve ser processada com sucesso.");

        DbContext.ChangeTracker.Clear();

        var physicalDevice = await DbContext.Devices.FindAsync(
            [deviceId],
            TestContext.Current.CancellationToken
        );

        physicalDevice!
            .IsOn.Should()
            .BeTrue("O handler deve espelhar o IsOn do payload para o Device.");

        var telemetryLog = await DbContext.DeviceTelemetryLogs.FirstOrDefaultAsync(
            log => log.DeviceId == deviceId,
            TestContext.Current.CancellationToken
        );

        telemetryLog.Should().NotBeNull("O registro histórico de telemetria DEVE existir.");
        telemetryLog!.IsOn.Should().BeTrue();
        telemetryLog.Voltage.Should().Be(220);
        telemetryLog.SignalStrength.Should().Be("-50dBm");
        telemetryLog
            .Timestamp.Should()
            .BeCloseTo(
                DateTimeOffset.UtcNow,
                TimeSpan.FromSeconds(2),
                "O timestamp deve ser gravado em UTC no momento do processamento."
            );
    }

    [Fact]
    public async Task ProcessTelemetry_WithInvalidTopicFormat_ShouldReturnFailure()
    {
        var command = new ProcessTelemetryCommand(
            Topic: "topico/aleatorio/invalido",
            Payload: "{ \"IsOn\": true }"
        );

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Mqtt.InvalidTopic");
    }

    [Fact]
    public async Task ProcessTelemetry_WithCorruptedJsonPayload_ShouldReturnFailure()
    {
        var command = new ProcessTelemetryCommand(
            Topic: "home/telemetry/MAC-VALIDO",
            Payload: "{ IsOn: true, JSON_QUEBRADO"
        );

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result
            .Error.Code.Should()
            .Be(
                "Telemetry.ParseError",
                "O bloco try-catch do handler deve interceptar a JsonException."
            );
    }

    [Fact]
    public async Task ProcessTelemetry_FromUnknownDevice_ShouldReturnFailure()
    {
        var command = new ProcessTelemetryCommand(
            Topic: "home/telemetry/MAC-DESCONHECIDO",
            Payload: "{ \"IsOn\": true }"
        );

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Device.NotFound");
    }
}
