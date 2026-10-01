using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Commands.CreateScene;

// Brilho, cor e temperatura de cor só são comandáveis em luz Tuya local
// (SetDeviceBrightness/Color/ColorTemp devolvem Device.*Unsupported nos demais).
// Uma cena não pode ser salva com um atributo que a ativação nunca conseguiria aplicar.
public class CreateSceneAttributeSupportTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Theory]
    [InlineData(50, null, null)]
    [InlineData(null, "#FFAA00", null)]
    [InlineData(null, null, 40)]
    public async Task CreateScene_WithLightAttributeOnNonTuyaLight_ShouldReturnUnprocessableEntity(
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
        var mqttLight = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Luz MQTT",
            ct,
            IntegrationType.NativeMqtt
        );

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest(
                "Luz sem brilho",
                null,
                [new SceneItemRequest(mqttLight.Id, true, brightness, colorHex, colorTemp)]
            ),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<JsonElement>(ct))
            .GetProperty("title")
            .GetString()
            .Should()
            .Be("Scene.Validation.UnsupportedAttributes");
        (await DbContext.Scenes.AnyAsync(ct)).Should().BeFalse();
    }

    [Fact]
    public async Task CreateScene_WithOnlyPowerOnNonTuyaLight_ShouldReturnCreated()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var mqttLight = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Luz MQTT",
            ct,
            IntegrationType.NativeMqtt
        );

        var response = await Client.PostAsJsonAsync(
            "/api/scenes",
            new SceneRequest("Só liga", null, [new SceneItemRequest(mqttLight.Id, true)]),
            ct
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
