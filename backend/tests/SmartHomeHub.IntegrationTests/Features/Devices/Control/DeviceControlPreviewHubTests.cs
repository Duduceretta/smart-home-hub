using System.Collections.Concurrent;
using FluentAssertions;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Control;

/// <summary>
/// Cobre o espelhamento de arraste de slider (brilho/cor/temperatura de cor,
/// individual e de grupo) entre clientes conectados via SignalR — ver
/// backend/docs/architecture.md, seção "SignalR / Hub". Não duplica a
/// cobertura já existente da coalescência de 75ms do driver
/// (<c>TuyaLightCommandCoalescerTests</c>) nem do fan-out isolado por
/// dispositivo de grupo (<c>SetDeviceGroupBrightnessCommandHandlerTests</c>)
/// — o Hub só precisa provar que dispara pelo MESMO caminho e que o
/// espelhamento chega aos outros clientes sem depender do resultado real do
/// comando contra o hardware (não há Tuya real disponível no ambiente de
/// teste).
/// </summary>
public class DeviceControlPreviewHubTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private HubConnection BuildConnection() =>
        new HubConnectionBuilder()
            .WithUrl(
                new Uri(Factory.Server.BaseAddress, "/hubs/telemetry?access_token=any"),
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => Factory.Server.CreateHandler();
                    options.Transports = HttpTransportType.LongPolling;
                }
            )
            .Build();

    private async Task<Device> SeedTuyaLightAsync()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var light = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz do Preview",
            Brand = "Tuya",
            ExternalId = "PREVIEW-1",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.TuyaLocal,
            Configuration = new TuyaDeviceConfiguration
            {
                LocalKey = "local-key-fake",
                IpAddress = "10.0.0.250",
                DpsBrightnessKey = "22",
                DpsColorKey = "24",
            },
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(light);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return light;
    }

    private async Task<DeviceGroup> SeedGroupWithLightsAsync(int lightCount)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var group = new DeviceGroup
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Grupo do Preview",
        };

        for (var i = 0; i < lightCount; i++)
        {
            group.Devices.Add(
                new Device
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Name = $"Luz {i}",
                    Brand = "Tuya",
                    ExternalId = $"PREVIEW-GRP-{i}",
                    Type = DeviceType.Light,
                    IntegrationType = IntegrationType.TuyaLocal,
                    Configuration = new TuyaDeviceConfiguration
                    {
                        LocalKey = "local-key-fake",
                        IpAddress = $"10.0.0.{200 + i}",
                        DpsBrightnessKey = "22",
                    },
                    LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
                }
            );
        }

        DbContext.Users.Add(user);
        DbContext.DeviceGroups.Add(group);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return group;
    }

    [Fact]
    public async Task PreviewDeviceBrightness_ShouldMirrorToOtherClients_ButNotToSender()
    {
        var light = await SeedTuyaLightAsync();

        await using var sender = BuildConnection();
        await using var observer = BuildConnection();

        var senderReceived = new ConcurrentBag<object>();
        var observerReceived = new ConcurrentBag<object>();
        sender.On<object>("DeviceControlPreview", payload => senderReceived.Add(payload));
        observer.On<object>("DeviceControlPreview", payload => observerReceived.Add(payload));

        await sender.StartAsync(TestContext.Current.CancellationToken);
        await observer.StartAsync(TestContext.Current.CancellationToken);

        await sender.InvokeAsync(
            "PreviewDeviceBrightness",
            light.Id,
            42,
            TestContext.Current.CancellationToken
        );
        await Task.Delay(500, TestContext.Current.CancellationToken);

        observerReceived
            .Should()
            .HaveCount(1, "o outro cliente conectado deve ver o eco do arraste");
        senderReceived
            .Should()
            .BeEmpty("o próprio remetente do arraste não deve receber eco de si mesmo");
    }

    [Fact]
    public async Task PreviewDeviceColorTemp_ShouldMirrorToOtherClients()
    {
        var light = await SeedTuyaLightAsync();

        await using var sender = BuildConnection();
        await using var observer = BuildConnection();

        var observerReceived = new ConcurrentBag<object>();
        observer.On<object>("DeviceControlPreview", payload => observerReceived.Add(payload));

        await sender.StartAsync(TestContext.Current.CancellationToken);
        await observer.StartAsync(TestContext.Current.CancellationToken);

        await sender.InvokeAsync(
            "PreviewDeviceColorTemp",
            light.Id,
            70,
            TestContext.Current.CancellationToken
        );
        await Task.Delay(500, TestContext.Current.CancellationToken);

        observerReceived.Should().HaveCount(1);
    }

    [Fact]
    public async Task PreviewGroupBrightness_WithMultipleDevices_ShouldCompleteWithoutDbContextConcurrencyError()
    {
        // Regressão do mesmo bug já corrigido em SetDeviceGroupBrightnessCommandHandler
        // (DbContext scoped compartilhado entre dispositivos concorrentes) — aqui pelo
        // caminho novo do Hub, que reaproveita o comando tal como está.
        var group = await SeedGroupWithLightsAsync(lightCount: 5);

        await using var sender = BuildConnection();
        await using var observer = BuildConnection();

        var observerReceived = new ConcurrentBag<object>();
        observer.On<object>("GroupControlPreview", payload => observerReceived.Add(payload));

        await sender.StartAsync(TestContext.Current.CancellationToken);
        await observer.StartAsync(TestContext.Current.CancellationToken);

        var invoke = async () =>
            await sender.InvokeAsync(
                "PreviewGroupBrightness",
                group.Id,
                55,
                TestContext.Current.CancellationToken
            );

        await invoke.Should().NotThrowAsync();
        await Task.Delay(1000, TestContext.Current.CancellationToken);

        observerReceived
            .Should()
            .HaveCount(
                1,
                "o espelhamento de grupo é um único evento por preview, não um por dispositivo"
            );
    }

    [Fact]
    public async Task PreviewDeviceBrightness_WhenDeviceDoesNotExist_ShouldNotThrowAndShouldStillMirror()
    {
        // O comando subjacente falha (Device.NotFound), mas isso é um Result.Failure,
        // não uma exceção — o preview é eco visual da posição do slider, desacoplado
        // do resultado real do comando contra o hardware.
        await using var sender = BuildConnection();
        await using var observer = BuildConnection();

        var observerReceived = new ConcurrentBag<object>();
        observer.On<object>("DeviceControlPreview", payload => observerReceived.Add(payload));

        await sender.StartAsync(TestContext.Current.CancellationToken);
        await observer.StartAsync(TestContext.Current.CancellationToken);

        var invoke = async () =>
            await sender.InvokeAsync(
                "PreviewDeviceBrightness",
                Guid.NewGuid(),
                10,
                TestContext.Current.CancellationToken
            );

        await invoke.Should().NotThrowAsync();
        await Task.Delay(500, TestContext.Current.CancellationToken);

        observerReceived.Should().HaveCount(1);
    }
}
