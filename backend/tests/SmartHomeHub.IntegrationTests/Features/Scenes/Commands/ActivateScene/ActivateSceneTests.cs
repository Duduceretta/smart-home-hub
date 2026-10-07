using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Commands.ActivateScene;

// O ITuyaLocalControlService é um NSubstitute singleton do factory (sem hardware real):
// zerar a configuração a cada teste evita vazamento de stub entre testes da coleção.
public class ActivateSceneTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuya =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();

    private void StubTuyaPowerSuccess(Device device, bool isOn) =>
        _tuya
            .SetPowerStateAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == device.ExternalId),
                isOn,
                Arg.Any<CancellationToken>()
            )
            .Returns(Result.Success(new TuyaCommandOutcome(isOn, null, null)));

    private static JsonElement ItemOf(JsonElement body, Guid deviceId) =>
        body.GetProperty("items")
            .EnumerateArray()
            .Single(item => item.GetProperty("deviceId").GetGuid() == deviceId);

    [Fact]
    public async Task ActivateScene_WithAllDevicesReachable_ShouldApplyStateAndRecordActivation()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Luz da Sala",
            cancellationToken: ct
        );
        var plug = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Tomada TV",
            isOn: true,
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneWithItemsAsync(
            DbContext,
            user.Id,
            "Modo Cinema",
            [
                new SceneItem
                {
                    DeviceId = lamp.Id,
                    IsOn = true,
                    Brightness = 40,
                },
                new SceneItem { DeviceId = plug.Id, IsOn = false },
            ],
            ct
        );

        StubTuyaPowerSuccess(lamp, true);
        StubTuyaPowerSuccess(plug, false);
        _tuya
            .SetBrightnessAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == lamp.ExternalId),
                40,
                Arg.Any<CancellationToken>()
            )
            .Returns(Result.Success(new TuyaBrightnessCommandOutcome(null, null)));

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        body.GetProperty("appliedCount").GetInt32().Should().Be(2);
        body.GetProperty("failedCount").GetInt32().Should().Be(0);
        body.GetProperty("skippedCount").GetInt32().Should().Be(0);
        ItemOf(body, lamp.Id).GetProperty("status").GetString().Should().Be("Applied");
        ItemOf(body, plug.Id).GetProperty("status").GetString().Should().Be("Applied");

        DbContext.ChangeTracker.Clear();
        var lampState = await DbContext.DeviceLiveStates.SingleAsync(
            s => s.DeviceId == lamp.Id,
            ct
        );
        lampState.IsOn.Should().BeTrue();
        lampState.Attributes.Brightness.Should().Be(40);
        (await DbContext.DeviceLiveStates.SingleAsync(s => s.DeviceId == plug.Id, ct))
            .IsOn.Should()
            .BeFalse();

        (await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct))
            .LastActivatedAt.Should()
            .NotBeNull();

        var summary = await DbContext.SystemEvents.SingleAsync(
            e => e.EventType == "SceneActivated",
            ct
        );
        summary.Source.Should().Be(EventSource.Scene);
        summary.UserId.Should().Be(user.Id);
        summary.Severity.Should().Be(EventSeverity.Info);
        summary.Title.Should().Contain("Modo Cinema");
        summary.TraceId.Should().NotBeNullOrEmpty();
        summary.SceneId.Should().Be(scene.Id);
        summary.SceneName.Should().Be("Modo Cinema");
    }

    [Fact]
    public async Task ActivateScene_SceneRenamedAfterwards_ShouldKeepTheNameOfTheMomentInTheEvent()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var plug = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Tomada TV",
            isOn: true,
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneWithItemsAsync(
            DbContext,
            user.Id,
            "Nome antigo",
            [new SceneItem { DeviceId = plug.Id, IsOn = false }],
            ct
        );
        StubTuyaPowerSuccess(plug, false);

        (await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct))
            .StatusCode.Should()
            .Be(HttpStatusCode.OK);

        DbContext.ChangeTracker.Clear();
        var tracked = await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct);
        tracked.Name = "Nome novo";
        await DbContext.SaveChangesAsync(ct);

        DbContext.ChangeTracker.Clear();
        var activation = await DbContext.SystemEvents.SingleAsync(
            e => e.EventType == "SceneActivated",
            ct
        );
        activation.SceneId.Should().Be(scene.Id);
        activation.SceneName.Should().Be("Nome antigo");
    }

    [Fact]
    public async Task ActivateScene_SceneLaterSoftDeleted_ShouldKeepTheEventIdentifiable()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var plug = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Tomada TV",
            isOn: true,
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneWithItemsAsync(
            DbContext,
            user.Id,
            "Apagada depois",
            [new SceneItem { DeviceId = plug.Id, IsOn = false }],
            ct
        );
        StubTuyaPowerSuccess(plug, false);
        await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        (await Client.DeleteAsync($"/api/scenes/{scene.Id}", ct))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        DbContext.ChangeTracker.Clear();
        var activation = await DbContext.SystemEvents.SingleAsync(
            e => e.EventType == "SceneActivated",
            ct
        );
        activation.SceneId.Should().Be(scene.Id);
        activation.SceneName.Should().Be("Apagada depois");
    }

    [Fact]
    public async Task ActivateScene_WithOfflineDevice_ShouldSkipItAndApplyTheOthers()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var online = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Online",
            cancellationToken: ct
        );
        var offline = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Offline",
            isOnline: false,
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Mista",
            [(online, true), (offline, true)],
            ct
        );
        StubTuyaPowerSuccess(online, true);

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        body.GetProperty("appliedCount").GetInt32().Should().Be(1);
        body.GetProperty("skippedCount").GetInt32().Should().Be(1);
        ItemOf(body, offline.Id).GetProperty("status").GetString().Should().Be("Skipped");
        ItemOf(body, online.Id).GetProperty("status").GetString().Should().Be("Applied");

        await _tuya
            .DidNotReceive()
            .SetPowerStateAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == offline.ExternalId),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );

        // Cena que não aplicou tudo (dispositivo offline pulado) é um alerta no histórico,
        // não uma ativação normal: é o que a taxa de sucesso das métricas conta como problema.
        DbContext.ChangeTracker.Clear();
        (await DbContext.SystemEvents.SingleAsync(e => e.EventType == "SceneActivated", ct))
            .Severity.Should()
            .Be(EventSeverity.Warning);
    }

    [Fact]
    public async Task ActivateScene_WhenOneDeviceFails_ShouldReportFailureAndKeepApplyingTheOthers()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var good = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Boa",
            cancellationToken: ct
        );
        var bad = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Ruim",
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Com falha",
            [(good, true), (bad, true)],
            ct
        );
        StubTuyaPowerSuccess(good, true);
        _tuya
            .SetPowerStateAsync(
                Arg.Is<TuyaDeviceConnectionInfo>(c => c.TuyaDeviceId == bad.ExternalId),
                true,
                Arg.Any<CancellationToken>()
            )
            .Returns(
                Result.Failure<TuyaCommandOutcome>(
                    new Error("Device.CommandFailed", "O dispositivo não respondeu.")
                )
            );

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        body.GetProperty("appliedCount").GetInt32().Should().Be(1);
        body.GetProperty("failedCount").GetInt32().Should().Be(1);
        var badItem = ItemOf(body, bad.Id);
        badItem.GetProperty("status").GetString().Should().Be("Failed");
        badItem.GetProperty("reason").GetString().Should().Be("O dispositivo não respondeu.");

        DbContext.ChangeTracker.Clear();
        (await DbContext.DeviceLiveStates.SingleAsync(s => s.DeviceId == good.Id, ct))
            .IsOn.Should()
            .BeTrue();
        var failedActivation = await DbContext.SystemEvents.SingleAsync(
            e => e.EventType == "SceneActivated",
            ct
        );
        failedActivation.SceneId.Should().NotBeNull();
        failedActivation.SceneName.Should().NotBeNullOrEmpty();
        (await DbContext.SystemEvents.SingleAsync(e => e.EventType == "SceneActivated", ct))
            .Severity.Should()
            .Be(EventSeverity.Warning);
        (await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct))
            .LastActivatedAt.Should()
            .NotBeNull();
    }

    [Fact]
    public async Task ActivateScene_WhenNothingIsApplied_ShouldNotRecordLastActivation()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var offline = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Offline",
            isOnline: false,
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Nada",
            [(offline, true)],
            ct
        );

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        DbContext.ChangeTracker.Clear();
        (await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct))
            .LastActivatedAt.Should()
            .BeNull();
    }

    [Fact]
    public async Task ActivateScene_ItemThatTurnsDeviceOff_ShouldNotSendLightAttributes()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Luz",
            isOn: true,
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneWithItemsAsync(
            DbContext,
            user.Id,
            "Apagar",
            [
                new SceneItem
                {
                    DeviceId = lamp.Id,
                    IsOn = false,
                    Brightness = 30,
                },
            ],
            ct
        );
        StubTuyaPowerSuccess(lamp, false);

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await _tuya
            .DidNotReceive()
            .SetBrightnessAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                Arg.Any<int>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task ActivateScene_FromAnotherUser_ShouldReturnNotFoundAndTouchNoDevice()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        await ScenesTestData.SeedUserAsync(DbContext, ScenesTestData.LoggedFirebaseUid, ct);
        var owner = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var device = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            owner.Id,
            DeviceType.Switch,
            "Do outro",
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            owner.Id,
            "Alheia",
            [(device, true)],
            ct
        );

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        await _tuya
            .DidNotReceive()
            .SetPowerStateAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }
}
