using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Features.Scenes;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Commands.DeleteDevice;

// O soft-delete de Device nunca dispara a FK de SceneItem (a linha do dispositivo continua
// existindo), então o handler precisa remover os itens de cena que o referenciam.
public class DeleteDeviceSceneItemsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteDevice_ShouldRemoveItsSceneItemsAndKeepTheOtherOnes()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(
            DbContext,
            ScenesTestData.LoggedFirebaseUid,
            ct
        );
        var doomed = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Light,
            "Será apagada",
            ct
        );
        var survivor = await ScenesTestData.SeedDeviceAsync(
            DbContext,
            user.Id,
            DeviceType.Switch,
            "Continua",
            ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Mista",
            [(doomed, true), (survivor, true)],
            ct
        );
        var otherScene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Só a apagada",
            [(doomed, false)],
            ct
        );

        var response = await Client.DeleteAsync($"/api/devices/{doomed.Id}", ct);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);

        DbContext.ChangeTracker.Clear();
        var remaining = await DbContext.SceneItems.IgnoreQueryFilters().ToListAsync(ct);

        remaining.Select(item => item.DeviceId).Should().NotContain(doomed.Id);
        remaining
            .Should()
            .ContainSingle(item => item.SceneId == scene.Id && item.DeviceId == survivor.Id);

        (await DbContext.Scenes.AnyAsync(s => s.Id == otherScene.Id, ct))
            .Should()
            .BeTrue("a cena continua existindo, só perde o item do dispositivo apagado");
    }

    [Fact]
    public async Task DeleteDevice_ShouldAlsoRemoveItemsOfAlreadyDeletedScenes()
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
            cancellationToken: ct
        );
        var scene = await ScenesTestData.SeedSceneAsync(
            DbContext,
            user.Id,
            "Já apagada",
            [(device, true)],
            ct
        );
        scene.IsDeleted = true;
        await DbContext.SaveChangesAsync(ct);

        var response = await Client.DeleteAsync($"/api/devices/{device.Id}", ct);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
        DbContext.ChangeTracker.Clear();
        (await DbContext.SceneItems.IgnoreQueryFilters().AnyAsync(ct))
            .Should()
            .BeFalse("não deve sobrar item órfão de cena apagada apontando pro dispositivo");
    }
}
