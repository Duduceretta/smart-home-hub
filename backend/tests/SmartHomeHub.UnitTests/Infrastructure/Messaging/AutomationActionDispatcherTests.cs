using FluentAssertions;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Infrastructure.Messaging;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.UnitTests.Infrastructure.Messaging;

public class AutomationActionDispatcherTests
{
    private readonly IMediator _mediator = Substitute.For<IMediator>();
    private readonly IRealtimeNotificationService _notificationService = Substitute.For<
        IRealtimeNotificationService
    >();
    private readonly AppDbContext _dbContext;
    private readonly AutomationActionDispatcher _sut;

    public AutomationActionDispatcherTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _dbContext = new AppDbContext(options);

        _sut = new AutomationActionDispatcher(
            _dbContext,
            _mediator,
            _notificationService,
            Substitute.For<ILogger<AutomationActionDispatcher>>()
        );
    }

    [Fact]
    public async Task DispatchAsync_WhenCommandSucceeds_ShouldNotifySuccess()
    {
        var automationId = Guid.NewGuid();
        var deviceId = Guid.NewGuid();
        const string firebaseUid = "uid-123";
        const string traceId = "trace-abc";

        var user = new User { Id = Guid.NewGuid(), ExternalAuthUid = firebaseUid };
        _dbContext.Automations.Add(
            new Automation
            {
                Id = automationId,
                UserId = user.Id,
                Name = "Desligar tudo à noite",
                RulePayload = "{}",
            }
        );
        _dbContext.Devices.Add(
            new Device
            {
                Id = deviceId,
                UserId = user.Id,
                Name = "Tomada da Sala",
            }
        );
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _mediator.Send(Arg.Any<SetDeviceStateCommand>(), Arg.Any<CancellationToken>())
            .Returns(Result.Success());

        await _sut.DispatchAsync(automationId, deviceId, firebaseUid, true, traceId);

        await _notificationService
            .Received(1)
            .NotifyAutomationExecutionResultAsync(
                firebaseUid,
                automationId,
                deviceId,
                true,
                null,
                traceId,
                Arg.Any<CancellationToken>()
            );
        _dbContext.IdempotencyRecords.Should().HaveCount(1);

        var systemEvent = _dbContext.SystemEvents.Should().ContainSingle().Subject;
        systemEvent.AutomationId.Should().Be(automationId);
        systemEvent.DeviceId.Should().Be(deviceId);
        systemEvent.EventType.Should().Be(ActivityEventTypes.AutomationExecuted);
        systemEvent.IsAlert.Should().BeFalse();
        systemEvent.Title.Should().Contain("Desligar tudo à noite");
        systemEvent.Description.Should().Contain("Tomada da Sala");
    }

    [Fact]
    public async Task DispatchAsync_WhenCommandReturnsLogicalFailure_ShouldNotifyFailureWithoutThrowing()
    {
        var automationId = Guid.NewGuid();
        var deviceId = Guid.NewGuid();
        const string firebaseUid = "uid-123";
        const string traceId = "trace-abc";
        var error = new Error("Device.NoIpAddress", "A TV precisa de um IP configurado.");

        _mediator.Send(Arg.Any<SetDeviceStateCommand>(), Arg.Any<CancellationToken>())
            .Returns(Result.Failure(error));

        var act = () => _sut.DispatchAsync(automationId, deviceId, firebaseUid, true, traceId);

        await act.Should().NotThrowAsync();
        await _notificationService
            .Received(1)
            .NotifyAutomationExecutionResultAsync(
                firebaseUid,
                automationId,
                deviceId,
                false,
                error.Description,
                traceId,
                Arg.Any<CancellationToken>()
            );

        var systemEvent = _dbContext.SystemEvents.Should().ContainSingle().Subject;
        systemEvent.IsAlert.Should().BeTrue();
        systemEvent.Description.Should().Contain(error.Description);
    }

    [Fact]
    public async Task DispatchAsync_WhenCommandThrows_ShouldNotifyFailureAndRethrowForHangfireRetry()
    {
        var automationId = Guid.NewGuid();
        var deviceId = Guid.NewGuid();
        const string firebaseUid = "uid-123";
        const string traceId = "trace-abc";
        var exception = new InvalidOperationException(
            "Falha física de comunicação com o dispositivo."
        );

        _mediator.Send(Arg.Any<SetDeviceStateCommand>(), Arg.Any<CancellationToken>())
            .Returns<ValueTask<Result>>(_ => throw exception);

        var act = () => _sut.DispatchAsync(automationId, deviceId, firebaseUid, true, traceId);

        await act.Should().ThrowAsync<InvalidOperationException>();
        await _notificationService
            .Received(1)
            .NotifyAutomationExecutionResultAsync(
                firebaseUid,
                automationId,
                deviceId,
                false,
                exception.Message,
                traceId,
                Arg.Any<CancellationToken>()
            );

        var systemEvent = _dbContext.SystemEvents.Should().ContainSingle().Subject;
        systemEvent.IsAlert.Should().BeTrue();
        systemEvent.Description.Should().Contain(exception.Message);
    }

    [Fact]
    public async Task DispatchAsync_WhenIdempotencyKeyAlreadyProcessed_ShouldSkipCommandAndNotify()
    {
        var automationId = Guid.NewGuid();
        var deviceId = Guid.NewGuid();
        const string firebaseUid = "uid-123";
        const string traceId = "trace-abc";

        _mediator.Send(Arg.Any<SetDeviceStateCommand>(), Arg.Any<CancellationToken>())
            .Returns(Result.Success());

        // Simula um job duplicado do Hangfire (mesma automação, mesmo evento,
        // mesmo dispositivo) já processado anteriormente.
        await _sut.DispatchAsync(automationId, deviceId, firebaseUid, true, traceId);
        _mediator.ClearReceivedCalls();
        _notificationService.ClearReceivedCalls();

        await _sut.DispatchAsync(automationId, deviceId, firebaseUid, true, traceId);

        await _mediator.DidNotReceive().Send(Arg.Any<SetDeviceStateCommand>(), Arg.Any<CancellationToken>());
        await _notificationService
            .DidNotReceive()
            .NotifyAutomationExecutionResultAsync(
                Arg.Any<string>(),
                Arg.Any<Guid>(),
                Arg.Any<Guid>(),
                Arg.Any<bool>(),
                Arg.Any<string?>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            );
        _dbContext.IdempotencyRecords.Should().HaveCount(1);
    }
}
