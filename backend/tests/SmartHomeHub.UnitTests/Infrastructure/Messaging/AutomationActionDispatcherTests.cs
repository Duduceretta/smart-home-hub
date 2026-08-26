using FluentAssertions;
using Mediator;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Infrastructure.Messaging;

namespace SmartHomeHub.UnitTests.Infrastructure.Messaging;

public class AutomationActionDispatcherTests
{
    private readonly IMediator _mediator = Substitute.For<IMediator>();
    private readonly IRealtimeNotificationService _notificationService = Substitute.For<
        IRealtimeNotificationService
    >();
    private readonly AutomationActionDispatcher _sut;

    public AutomationActionDispatcherTests()
    {
        _sut = new AutomationActionDispatcher(
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
    }

    [Fact]
    public async Task DispatchAsync_WhenCommandThrows_ShouldNotifyFailureAndRethrowForHangfireRetry()
    {
        var automationId = Guid.NewGuid();
        var deviceId = Guid.NewGuid();
        const string firebaseUid = "uid-123";
        const string traceId = "trace-abc";
        var exception = new InvalidOperationException("Falha física de comunicação com o dispositivo.");

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
    }
}
