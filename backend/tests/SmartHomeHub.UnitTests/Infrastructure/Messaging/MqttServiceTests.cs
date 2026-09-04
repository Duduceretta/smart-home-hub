using System.Reflection;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MQTTnet;
using NSubstitute;
using SmartHomeHub.Infrastructure.Messaging;

namespace SmartHomeHub.UnitTests.Infrastructure.Messaging;

public class MqttServiceTests
{
    // NSubstitute não verifica bem chamadas ao método genérico ILogger.Log<TState>
    // (o TState real usado pelas extensions como LogCritical não bate com
    // Arg.Any<object>()) — um fake simples que captura via o formatter é mais
    // confiável pra afirmar nível/exceção/mensagem.
    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message, Exception? Exception)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        ) => Entries.Add((logLevel, formatter(state, exception), exception));
    }

    private static async Task WaitUntilAsync(Func<bool> condition, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (!condition() && DateTime.UtcNow < deadline)
        {
            await Task.Delay(10);
        }
    }

    [Fact]
    public async Task RunSupervisedAsync_WhenWorkThrowsUnexpectedException_ShouldLogCriticalAndRestartWork()
    {
        // Arrange — retry curto pra não esperar o default de produção (5s).
        var recordingLogger = new RecordingLogger<MqttService>();
        var sut = new MqttService(
            recordingLogger,
            Substitute.For<IServiceScopeFactory>(),
            retryDelayForTests: TimeSpan.FromMilliseconds(50)
        );

        var callCount = 0;
        Task Work(CancellationToken ct)
        {
            callCount++;
            if (callCount == 1)
            {
                throw new InvalidOperationException("Falha simulada no loop de manutenção.");
            }

            // Segunda chamada em diante: fica "rodando" até o teste cancelar.
            return Task.Delay(Timeout.Infinite, ct);
        }

        using var cts = new CancellationTokenSource();

        // Act
        var supervisorTask = sut.RunSupervisedAsync(Work, "op-teste", cts.Token);
        await WaitUntilAsync(() => callCount >= 2, TimeSpan.FromSeconds(2));
        cts.Cancel();
        await supervisorTask;

        // Assert
        callCount
            .Should()
            .BeGreaterThanOrEqualTo(
                2,
                "work deve ter sido reiniciado depois de lançar uma exceção não tratada, não deixado morto."
            );

        recordingLogger
            .Entries.Should()
            .Contain(
                e =>
                    e.Level == LogLevel.Critical
                    && e.Exception is InvalidOperationException
                    && e.Message.Contains("op-teste"),
                "a morte inesperada do loop deve ser logada como CRÍTICA, não silenciosa nem em nível baixo."
            );
    }

    [Fact]
    public async Task RunSupervisedAsync_WhenCancellationRequested_ShouldStopWithoutLoggingCritical()
    {
        // Arrange — shutdown gracioso não deve gerar log crítico nenhum.
        var recordingLogger = new RecordingLogger<MqttService>();
        var sut = new MqttService(recordingLogger, Substitute.For<IServiceScopeFactory>());

        using var cts = new CancellationTokenSource();

        static async Task Work(CancellationToken ct)
        {
            await Task.Delay(Timeout.Infinite, ct);
        }

        // Act
        var supervisorTask = sut.RunSupervisedAsync(Work, "op-teste", cts.Token);
        await Task.Delay(20);
        cts.Cancel();
        await supervisorTask;

        // Assert
        recordingLogger.Entries.Should().NotContain(e => e.Level == LogLevel.Critical);
    }

    [Fact]
    public async Task PublishAsync_ShouldPropagateCancellationTokenToUnderlyingClient()
    {
        // Arrange
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(true);
        fakeClient
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>())
            .Returns(
                new MqttClientPublishResult(null, MqttClientPublishReasonCode.Success, null, null)
            );

        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        using var cts = new CancellationTokenSource();

        // Act
        await sut.PublishAsync("home/commands/abc", "{}", cts.Token);

        // Assert — não pode ter virado CancellationToken.None no meio do caminho.
        await fakeClient.Received(1).PublishAsync(Arg.Any<MqttApplicationMessage>(), cts.Token);
    }

    [Fact]
    public async Task PublishAsync_WithAlreadyCancelledToken_ShouldNotSwallowCancellation()
    {
        // Arrange
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(true);
        fakeClient
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>())
            .Returns<Task<MqttClientPublishResult>>(callInfo =>
                throw new OperationCanceledException(callInfo.Arg<CancellationToken>())
            );

        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        // Act
        Func<Task> act = () => sut.PublishAsync("home/commands/abc", "{}", cts.Token);

        // Assert — um shutdown em andamento deve conseguir interromper o publish,
        // não ser ignorado silenciosamente (CancellationToken.None antigo faria isso).
        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task ConfigureEvents_OnConnected_ShouldSubscribeWithAtLeastOnceQoS()
    {
        // Arrange
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient
            .SubscribeAsync(Arg.Any<MqttClientSubscribeOptions>(), Arg.Any<CancellationToken>())
            .Returns(new MqttClientSubscribeResult(0, [], null, []));

        // IMqttClient.ConnectedAsync é um event de verdade — NSubstitute não
        // deixa disparar de fora, então captura o handler no momento do "+="
        // (que ConfigureEvents faz) pra invocar manualmente depois.
        Func<MqttClientConnectedEventArgs, Task>? connectedHandler = null;
        fakeClient
            .When(x => x.ConnectedAsync += Arg.Any<Func<MqttClientConnectedEventArgs, Task>>())
            .Do(ci => connectedHandler = ci.Arg<Func<MqttClientConnectedEventArgs, Task>>());

        typeof(MqttService)
            .GetMethod("ConfigureEvents", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(sut, [fakeClient]);

        // Act — simula o broker confirmando a conexão.
        connectedHandler.Should().NotBeNull();
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );

        // Assert
        await fakeClient
            .Received(1)
            .SubscribeAsync(
                Arg.Is<MqttClientSubscribeOptions>(options =>
                    options.TopicFilters.Count == 1
                    && options.TopicFilters[0].Topic == "home/#"
                    && options.TopicFilters[0].QualityOfServiceLevel
                        == MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce
                ),
                Arg.Any<CancellationToken>()
            );
    }
}
