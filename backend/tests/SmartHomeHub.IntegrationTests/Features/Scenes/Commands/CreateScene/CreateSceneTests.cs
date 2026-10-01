using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Commands.CreateScene;

public class CreateSceneTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task CreateScene_WithValidData_ShouldReturnCreatedAndPersistItems()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Luz",
            ct
        );
        var plug = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Tomada",
            ct
        );

        var request = new SceneRequest(
            "Modo Cinema",
            "Clapperboard",
            [
                new SceneItemRequest(
                    lamp.Id,
                    true,
                    Brightness: 10,
                    ColorHex: "#FFAA00",
                    ColorTempPercent: 30
                ),
                new SceneItemRequest(plug.Id, false),
            ]
        );

        var response = await Client.PostAsJsonAsync("/api/scenes", request, ct);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        var sceneId = body.GetProperty("sceneId").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"/api/scenes/{sceneId}");

        DbContext.ChangeTracker.Clear();
        var saved = await DbContext
            .Scenes.Include(s => s.Items)
            .SingleAsync(s => s.Id == sceneId, ct);

        saved.UserId.Should().Be(user.Id);
        saved.Name.Should().Be("Modo Cinema");
        saved.Icon.Should().Be("Clapperboard");
        saved.Items.Should().HaveCount(2);

        var lampItem = saved.Items.Single(i => i.DeviceId == lamp.Id);
        lampItem.IsOn.Should().BeTrue();
        lampItem.Brightness.Should().Be(10);
        lampItem.ColorHex.Should().Be("#FFAA00");
        lampItem.ColorTempPercent.Should().Be(30);
        saved.Items.Single(i => i.DeviceId == plug.Id).IsOn.Should().BeFalse();
    }

    [Fact]
    public async Task CreateScene_WithDeviceFromAnotherUser_ShouldReturnBadRequest()
    {
        var ct = TestContext.Current.CancellationToken;
        await ScenesTestData.SeedUserAsync(DbContext, ScenesTestData.LoggedFirebaseUid, ct);
        var otherUser = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        var foreignLamp = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            otherUser.Id,
            cancellationToken: ct
        );

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest("Invasora", null, [new SceneItemRequest(foreignLamp.Id, true)]),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<JsonElement>(ct))
            .GetProperty("title")
            .GetString()
            .Should()
            .Be("Scene.InvalidDevices");
        (await DbContext.Scenes.AnyAsync(ct)).Should().BeFalse();
    }

    [Theory]
    [InlineData(DeviceType.Lock)]
    [InlineData(DeviceType.Camera)]
    [InlineData(DeviceType.Alarm)]
    [InlineData(DeviceType.Sensor)]
    public async Task CreateScene_WithNonControllableDevice_ShouldReturnUnprocessableEntity(
        DeviceType type
    )
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var device = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            type,
            cancellationToken: ct
        );

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest("Segurança", null, [new SceneItemRequest(device.Id, true)]),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<JsonElement>(ct))
            .GetProperty("title")
            .GetString()
            .Should()
            .Be("Scene.Validation.UnsupportedDeviceType");
        (await DbContext.Scenes.AnyAsync(ct)).Should().BeFalse();
    }

    [Fact]
    public async Task CreateScene_WithLightAttributesOnSwitch_ShouldReturnUnprocessableEntity()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var plug = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            cancellationToken: ct
        );

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest(
                "Tomada com brilho",
                null,
                [new SceneItemRequest(plug.Id, true, Brightness: 50)]
            ),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<JsonElement>(ct))
            .GetProperty("title")
            .GetString()
            .Should()
            .Be("Scene.Validation.UnsupportedAttributes");
    }

    [Fact]
    public async Task CreateScene_WithEmptyName_ShouldReturnBadRequest()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedDeviceAsync(DbContext, user.Id, cancellationToken: ct);

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest("", null, [new SceneItemRequest(lamp.Id, true)]),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateScene_WithoutItems_ShouldReturnBadRequest()
    {
        var ct = TestContext.Current.CancellationToken;
        await ScenesTestData.SeedUserAsync(DbContext, ScenesTestData.LoggedFirebaseUid, ct);

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest("Vazia", null, []),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateScene_WithSameDeviceTwice_ShouldReturnBadRequest()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedDeviceAsync(DbContext, user.Id, cancellationToken: ct);

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest(
                "Dupla",
                null,
                [new SceneItemRequest(lamp.Id, true), new SceneItemRequest(lamp.Id, false)]
            ),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await DbContext.Scenes.AnyAsync(ct)).Should().BeFalse();
    }

    [Theory]
    [InlineData(101, null, null)]
    [InlineData(null, "FFAA00", null)]
    [InlineData(null, null, -1)]
    public async Task CreateScene_WithOutOfRangeLightAttribute_ShouldReturnBadRequest(
        int? brightness,
        string? colorHex,
        int? colorTemp
    )
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var lamp = await ScenesTestData.SeedDeviceAsync(DbContext, user.Id, cancellationToken: ct);

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest(
                "Inválida",
                null,
                [new SceneItemRequest(lamp.Id, true, brightness, colorHex, colorTemp)]
            ),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
