using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Scenes.Commands.DeleteScene;

public class DeleteSceneTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task DeleteScene_ShouldSoftDeleteAndHideFromQueries()
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
            "Boa Noite",
            [(lamp, false)],
            ct
        );

        var response = await Client.DeleteAsync($"/api/scenes/{scene.Id}", ct);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        DbContext.ChangeTracker.Clear();
        var physical = await DbContext
            .Scenes.IgnoreQueryFilters()
            .SingleAsync(s => s.Id == scene.Id, ct);
        physical.IsDeleted.Should().BeTrue();
        physical.DeletedAt.Should().NotBeNull();

        (await Client.GetAsync($"/api/scenes/{scene.Id}", ct))
            .StatusCode.Should()
            .Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteScene_FromAnotherUser_ShouldReturnNotFoundAndKeepScene()
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

        var response = await Client.DeleteAsync($"/api/scenes/{scene.Id}", ct);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        DbContext.ChangeTracker.Clear();
        (await DbContext.Scenes.SingleAsync(s => s.Id == scene.Id, ct))
            .IsDeleted.Should()
            .BeFalse();
    }
}
