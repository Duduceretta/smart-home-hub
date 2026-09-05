using System.Collections.Concurrent;
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

    private static ConcurrentDictionary<string, string> GetDesiredCommands(MqttService sut) =>
        (ConcurrentDictionary<string, string>)
            typeof(MqttService)
                .GetField("_desiredCommands", BindingFlags.NonPublic | BindingFlags.Instance)!
                .GetValue(sut)!;

    [Fact]
    public async Task PublishAsync_WhenBrokerOffline_ShouldKeepDesiredCommandRegistered()
    {
        // Arrange — cenário 1: broker fora do ar, comando não pode ser
        // descartado silenciosamente — o estado desejado sobrevive pra
        // reconciliação na reconexão.
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(false);

        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        // Act
        await sut.PublishAsync(
            "home/commands/device-1",
            "{\"action\":\"turn_on\"}",
            CancellationToken.None
        );

        // Assert
        GetDesiredCommands(sut)
            .Should()
            .ContainKey("home/commands/device-1")
            .WhoseValue.Should()
            .Be("{\"action\":\"turn_on\"}");

        await fakeClient
            .DidNotReceive()
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishAsync_MultipleCommandsWhileOffline_ShouldOverwriteNotAccumulate()
    {
        // Arrange — cenário 2: liga, desliga, liga de novo com broker fora —
        // só o último valor deve sobreviver, não uma fila dos três.
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(false);

        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        // Act
        await sut.PublishAsync("home/commands/device-1", "on", CancellationToken.None);
        await sut.PublishAsync("home/commands/device-1", "off", CancellationToken.None);
        await sut.PublishAsync("home/commands/device-1", "on", CancellationToken.None);

        // Assert
        var desiredCommands = GetDesiredCommands(sut);
        desiredCommands.Should().HaveCount(1);
        desiredCommands["home/commands/device-1"].Should().Be("on");
    }

    [Fact]
    public async Task ReconcileDesiredCommandsAsync_OnReconnect_ShouldRepublishPendingCommand()
    {
        // Arrange — cenário 3: reconexão republica o valor pendente sem
        // intervenção do usuário.
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(false);
        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        await sut.PublishAsync("home/commands/device-1", "on", CancellationToken.None);

        fakeClient
            .SubscribeAsync(Arg.Any<MqttClientSubscribeOptions>(), Arg.Any<CancellationToken>())
            .Returns(new MqttClientSubscribeResult(0, [], null, []));
        fakeClient
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>())
            .Returns(
                new MqttClientPublishResult(null, MqttClientPublishReasonCode.Success, null, null)
            );

        Func<MqttClientConnectedEventArgs, Task>? connectedHandler = null;
        fakeClient
            .When(x => x.ConnectedAsync += Arg.Any<Func<MqttClientConnectedEventArgs, Task>>())
            .Do(ci => connectedHandler = ci.Arg<Func<MqttClientConnectedEventArgs, Task>>());

        typeof(MqttService)
            .GetMethod("ConfigureEvents", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(sut, [fakeClient]);

        // Act — simula reconexão do broker.
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );

        // Assert
        await fakeClient
            .Received(1)
            .PublishAsync(
                Arg.Is<MqttApplicationMessage>(m =>
                    m.Topic == "home/commands/device-1" && m.ConvertPayloadToString() == "on"
                ),
                Arg.Any<CancellationToken>()
            );

        GetDesiredCommands(sut)
            .Should()
            .BeEmpty("comando reconciliado com sucesso não deve continuar pendente.");
    }

    [Fact]
    public async Task ReconcileDesiredCommandsAsync_WithTwoDevices_ShouldNotMixPendingValues()
    {
        // Arrange — cenário 4: dois dispositivos diferentes, cada um reconcilia
        // seu próprio valor mais recente, sem se misturar.
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(false);
        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        await sut.PublishAsync("home/commands/device-1", "on", CancellationToken.None);
        await sut.PublishAsync("home/commands/device-2", "off", CancellationToken.None);

        fakeClient
            .SubscribeAsync(Arg.Any<MqttClientSubscribeOptions>(), Arg.Any<CancellationToken>())
            .Returns(new MqttClientSubscribeResult(0, [], null, []));
        fakeClient
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>())
            .Returns(
                new MqttClientPublishResult(null, MqttClientPublishReasonCode.Success, null, null)
            );

        Func<MqttClientConnectedEventArgs, Task>? connectedHandler = null;
        fakeClient
            .When(x => x.ConnectedAsync += Arg.Any<Func<MqttClientConnectedEventArgs, Task>>())
            .Do(ci => connectedHandler = ci.Arg<Func<MqttClientConnectedEventArgs, Task>>());

        typeof(MqttService)
            .GetMethod("ConfigureEvents", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(sut, [fakeClient]);

        // Act
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );

        // Assert
        await fakeClient
            .Received(1)
            .PublishAsync(
                Arg.Is<MqttApplicationMessage>(m =>
                    m.Topic == "home/commands/device-1" && m.ConvertPayloadToString() == "on"
                ),
                Arg.Any<CancellationToken>()
            );
        await fakeClient
            .Received(1)
            .PublishAsync(
                Arg.Is<MqttApplicationMessage>(m =>
                    m.Topic == "home/commands/device-2" && m.ConvertPayloadToString() == "off"
                ),
                Arg.Any<CancellationToken>()
            );

        GetDesiredCommands(sut).Should().BeEmpty();
    }

    [Fact]
    public async Task ReconcileDesiredCommandsAsync_AfterSuccessfulReconciliation_ShouldNotRepublishOnNextReconnect()
    {
        // Arrange — cenário 5: sem novo comando no meio, reconciliação já
        // feita não deve republicar de novo numa reconexão futura.
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.IsConnected.Returns(false);
        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        await sut.PublishAsync("home/commands/device-1", "on", CancellationToken.None);

        fakeClient
            .SubscribeAsync(Arg.Any<MqttClientSubscribeOptions>(), Arg.Any<CancellationToken>())
            .Returns(new MqttClientSubscribeResult(0, [], null, []));
        fakeClient
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>())
            .Returns(
                new MqttClientPublishResult(null, MqttClientPublishReasonCode.Success, null, null)
            );

        Func<MqttClientConnectedEventArgs, Task>? connectedHandler = null;
        fakeClient
            .When(x => x.ConnectedAsync += Arg.Any<Func<MqttClientConnectedEventArgs, Task>>())
            .Do(ci => connectedHandler = ci.Arg<Func<MqttClientConnectedEventArgs, Task>>());

        typeof(MqttService)
            .GetMethod("ConfigureEvents", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(sut, [fakeClient]);

        // Act — primeira reconexão reconcilia; segunda reconexão sem novo comando.
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );

        // Assert — publish de comando (exclui o subscribe) só uma vez.
        await fakeClient
            .Received(1)
            .PublishAsync(Arg.Any<MqttApplicationMessage>(), Arg.Any<CancellationToken>());
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

    [Fact]
    public async Task StartAsync_ShouldConfigurePersistentSessionWithFixedClientIdAndNoDelay()
    {
        // Arrange
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        // Act
        await sut.StartAsync(CancellationToken.None);

        // Assert
        var options = (MqttClientOptions)
            typeof(MqttService)
                .GetField("_options", BindingFlags.NonPublic | BindingFlags.Instance)!
                .GetValue(sut)!;

        options
            .ClientId.Should()
            .Be(
                "SmartHomeHub_Backend",
                "ClientId fixo é pré-requisito da sessão persistente — não pode ser gerado por conexão."
            );
        options.CleanSession.Should().BeFalse("sessão persistente exige CleanStart(false).");
        options
            .SessionExpiryInterval.Should()
            .BeGreaterThan(
                0,
                "CleanStart(false) sozinho não basta em MQTT v5 — sem SessionExpiryInterval > 0 o broker descarta a sessão de qualquer forma."
            );

        options.ChannelOptions.Should().BeOfType<MqttClientTcpOptions>();
        ((MqttClientTcpOptions)options.ChannelOptions!).NoDelay.Should().BeTrue();
    }

    [Fact]
    public async Task StopAsync_ShouldCancelSupervisorAndDisconnectClientCleanly()
    {
        // Arrange
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>(),
            retryDelayForTests: TimeSpan.FromMilliseconds(20)
        );

        await sut.StartAsync(CancellationToken.None);

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient.TryPingAsync(Arg.Any<CancellationToken>()).Returns(true);
        fakeClient
            .DisconnectAsync(Arg.Any<MqttClientDisconnectOptions>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        typeof(MqttService)
            .GetField("_client", BindingFlags.NonPublic | BindingFlags.Instance)!
            .SetValue(sut, fakeClient);

        // Act
        var stopTask = sut.StopAsync(CancellationToken.None);
        var completed = await Task.WhenAny(stopTask, Task.Delay(TimeSpan.FromSeconds(5)));

        // Assert
        completed.Should().Be(stopTask, "StopAsync não pode travar o shutdown indefinidamente.");
        await stopTask; // propaga qualquer exceção não observada, se houver.

        var maintainTask = (Task?)
            typeof(MqttService)
                .GetField(
                    "_maintainConnectionTask",
                    BindingFlags.NonPublic | BindingFlags.Instance
                )!
                .GetValue(sut);
        maintainTask.Should().NotBeNull();
        maintainTask!.IsCompleted.Should().BeTrue("o supervisor deve ter parado de reconectar.");

        await fakeClient
            .Received(1)
            .DisconnectAsync(Arg.Any<MqttClientDisconnectOptions>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ConfigureEvents_AfterBriefReconnect_ShouldStillResubscribeToWildcardTopic()
    {
        // Arrange — sessão persistente pode fazer o broker restaurar a
        // subscription sozinho, mas o código deve continuar resubscrevendo em
        // TODA reconexão (SUBSCRIBE é idempotente) — não deve pressupor que a
        // sessão sempre foi retomada e pular a resubscrição.
        var sut = new MqttService(
            Substitute.For<ILogger<MqttService>>(),
            Substitute.For<IServiceScopeFactory>()
        );

        var fakeClient = Substitute.For<IMqttClient>();
        fakeClient
            .SubscribeAsync(Arg.Any<MqttClientSubscribeOptions>(), Arg.Any<CancellationToken>())
            .Returns(new MqttClientSubscribeResult(0, [], null, []));

        Func<MqttClientConnectedEventArgs, Task>? connectedHandler = null;
        fakeClient
            .When(x => x.ConnectedAsync += Arg.Any<Func<MqttClientConnectedEventArgs, Task>>())
            .Do(ci => connectedHandler = ci.Arg<Func<MqttClientConnectedEventArgs, Task>>());

        typeof(MqttService)
            .GetMethod("ConfigureEvents", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(sut, [fakeClient]);

        connectedHandler.Should().NotBeNull();

        // Act — simula: conecta, reconexão breve (sessão persistida), conecta de novo.
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );
        await connectedHandler!.Invoke(
            new MqttClientConnectedEventArgs(new MqttClientConnectResult())
        );

        // Assert
        await fakeClient
            .Received(2)
            .SubscribeAsync(
                Arg.Is<MqttClientSubscribeOptions>(options =>
                    options.TopicFilters.Count == 1 && options.TopicFilters[0].Topic == "home/#"
                ),
                Arg.Any<CancellationToken>()
            );
    }
}
