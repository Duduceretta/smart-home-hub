using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Commands.UpdateScene;

public class UpdateSceneTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task UpdateScene_ShouldRenameAndSyncItems()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var kept = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Mantida",
            ct
        );
        var removed = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Removida",
            ct
        );
        var added = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Nova",
            ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Antiga",
            [(kept, true), (removed, true)],
            ct
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/scenes/{scene.Id}",
            new SceneRequest(
                "Nova Cena",
                "Moon",
                [
                    new SceneItemRequest(kept.Id, false, Brightness: 20),
                    new SceneItemRequest(added.Id, true),
                ]
            ),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        DbContext.ChangeTracker.Clear();
        var saved = await DbContext
            .Scenes.Include(s => s.Items)
            .SingleAsync(s => s.Id == scene.Id, ct);

        saved.Name.Should().Be("Nova Cena");
        saved.Icon.Should().Be("Moon");
        saved.UpdatedAt.Should().NotBeNull();
        saved.Items.Select(i => i.DeviceId).Should().BeEquivalentTo([kept.Id, added.Id]);

        var keptItem = saved.Items.Single(i => i.DeviceId == kept.Id);
        keptItem.IsOn.Should().BeFalse();
        keptItem.Brightness.Should().Be(20);
        saved.Items.Single(i => i.DeviceId == added.Id).IsOn.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateScene_FromAnotherUser_ShouldReturnNotFoundAndKeepScene()
    {
        var ct = TestContext.Current.CancellationToken;
        await ScenesTestData.SeedUserAsync(DbContext, ScenesTestData.LoggedFirebaseUid, ct);
        var owner = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var lamp = await ScenesTestData.SeedDeviceAsync(DbContext, owner.Id, cancellationToken: ct);
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            owner.Id,
            "Do outro",
            [(lamp, true)],
            ct
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/scenes/{scene.Id}",
            new SceneRequest("Sequestrada", null, [new SceneItemRequest(lamp.Id, false)]),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        DbContext.ChangeTracker.Clear();
        (await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct))
            .Name.Should()
            .Be("Do outro");
    }

    [Fact]
    public async Task UpdateScene_WithSecurityDevice_ShouldReturnUnprocessableEntityAndKeepScene()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedDeviceAsync(DbContext, user.Id, cancellationToken: ct);
        var door = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Lock,
            "Porta",
            ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Original",
            [(lamp, true)],
            ct
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/scenes/{scene.Id}",
            new SceneRequest(
                "Alterada",
                null,
                [new SceneItemRequest(lamp.Id, true), new SceneItemRequest(door.Id, false)]
            ),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<JsonElement>(ct))
            .GetProperty("title")
            .GetString()
            .Should()
            .Be("Scene.Validation.UnsupportedDeviceType");

        DbContext.ChangeTracker.Clear();
        var saved = await DbContext
            .Scenes.Include(s => s.Items)
            .SingleAsync(s => s.Id == scene.Id, ct);
        saved.Name.Should().Be("Original");
        saved.Items.Should().HaveCount(1);
    }
}
