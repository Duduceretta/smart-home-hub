using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Queries;

public class GetScenesTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task GetScenes_ShouldReturnOnlyOwnActiveScenesOrderedByName()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var other = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var lamp = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Luz da Sala",
            ct
        );
        var otherLamp = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            other.Id,
            cancellationToken: ct
        );

        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Zen", [(lamp, true)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, user.Id, "Acordar", [(lamp, false)], ct);
        await ScenesTestData.SeedSceneAsync(DbContext, other.Id, "Alheia", [(otherLamp, true)], ct);
        var deleted = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Apagada",
            [(lamp, true)],
            ct
        );
        deleted.IsDeleted = true;
        await DbContext.SaveChangesAsync(ct);

        var response = await Client.GetAsync("/api/scenes", ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        body.GetProperty("totalCount").GetInt32().Should().Be(2);

        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Select(i => i.GetProperty("name").GetString()).Should().Equal("Acordar", "Zen");

        var firstItem = items[0].GetProperty("items").EnumerateArray().Single();
        firstItem.GetProperty("deviceId").GetGuid().Should().Be(lamp.Id);
        firstItem.GetProperty("deviceName").GetString().Should().Be("Luz da Sala");
        firstItem.GetProperty("deviceType").GetInt32().Should().Be((int)DeviceType.Light);
        firstItem.GetProperty("isOn").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task GetScenes_ShouldOmitItemsOfDeletedDevices()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var alive = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Viva",
            ct
        );
        var gone = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Removida",
            ct
        );
        await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Mista",
            [(alive, true), (gone, true)],
            ct
        );
        gone.IsDeleted = true;
        await DbContext.SaveChangesAsync(ct);

        var body = await (
            await Client.GetAsync("/api/scenes", ct)
        ).Content.ReadFromJsonAsync<JsonElement>(ct);

        var sceneItems = body.GetProperty("items")[0]
            .GetProperty("items")
            .EnumerateArray()
            .ToList();
        sceneItems.Should().ContainSingle();
        sceneItems[0].GetProperty("deviceId").GetGuid().Should().Be(alive.Id);
    }

    [Fact]
    public async Task GetSceneById_OwnScene_ShouldReturnOk()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedDeviceAsync(DbContext, user.Id, cancellationToken: ct);
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Cinema",
            [(lamp, true)],
            ct
        );

        var response = await Client.GetAsync($"/api/scenes/{scene.Id}", ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        body.GetProperty("id").GetGuid().Should().Be(scene.Id);
        body.GetProperty("name").GetString().Should().Be("Cinema");
        body.GetProperty("items").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetSceneById_FromAnotherUser_ShouldReturnNotFound()
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

        var response = await Client.GetAsync($"/api/scenes/{scene.Id}", ct);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
