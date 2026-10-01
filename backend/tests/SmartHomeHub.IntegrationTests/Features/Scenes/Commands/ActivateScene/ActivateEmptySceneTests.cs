using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Commands.ActivateScene;

// Uma cena fica vazia quando o último dispositivo dela é apagado (a cena continua existindo,
// só perde o item). Ativá-la não tem o que aplicar: deve ser recusada com mensagem clara,
// sem gravar um evento "0 de 0 dispositivos aplicados" no histórico.
public class ActivateEmptySceneTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ITuyaLocalControlService _tuya =
        factory.Services.GetRequiredService<ITuyaLocalControlService>();

    [Fact]
    public async Task ActivateScene_WithoutAnyItem_ShouldReturnUnprocessableEntityAndRecordNothing()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Vazia", [], ct);

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<JsonElement>(ct))
            .GetProperty("title")
            .GetString()
            .Should()
            .Be("Scene.Validation.NoDevices");

        DbContext.ChangeTracker.Clear();
        (await DbContext.SystemEvents.AnyAsync(e => e.EventType == "SceneActivated", ct))
            .Should()
            .BeFalse();
        (await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct))
            .LastActivatedAt.Should()
            .BeNull();
    }

    [Fact]
    public async Task ActivateScene_WhoseOnlyDeviceWasDeleted_ShouldReturnUnprocessableEntity()
    {
        _tuya.ClearSubstitute(ClearOptions.All);
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var device = await ScenesTestData.SeedTuyaDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Será apagada",
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Perde o dispositivo",
            [(device, true)],
            ct
        );

        (await Client.DeleteAsync($"/api/devices/{device.Id}", ct))
            .IsSuccessStatusCode.Should()
            .BeTrue();

        var response = await Client.PostAsync($"/api/scenes/{scene.Id}/activate", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        await _tuya
            .DidNotReceive()
            .SetPowerStateAsync(
                Arg.Any<TuyaDeviceConnectionInfo>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }
}
