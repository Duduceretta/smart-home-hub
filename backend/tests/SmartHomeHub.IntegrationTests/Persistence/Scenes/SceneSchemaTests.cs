using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Persistence.Scenes;

// Valida o schema físico de Scene/SceneItem (migration AddScenes):
// 1. Scene + itens persistem e voltam com o estado desejado de cada dispositivo.
// 2. (SceneId, DeviceId) é único — um dispositivo aparece uma única vez por cena.
// 3. Scenes.UserId -> Users.Id é Restrict (simetria com Device/Room/DeviceGroup/Automation).
// 4. SceneItems.DeviceId -> Devices.Id é Restrict (mesma proteção física de Device já existente).
public class SceneSchemaTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task SaveScene_WithItems_ShouldPersistDesiredStatePerDevice()
    {
        var (user, lamp, plug) = await SeedUserWithTwoDevicesAsync();

        var scene = new Scene
        {
            UserId = user.Id,
            Name = "Modo Cinema",
            Icon = "Clapperboard",
            Items =
            [
                new SceneItem
                {
                    DeviceId = lamp.Id,
                    IsOn = true,
                    Brightness = 10,
                    ColorHex = "#FFAA00",
                    ColorTempPercent = 30,
                },
                new SceneItem { DeviceId = plug.Id, IsOn = false },
            ],
        };

        DbContext.Scenes.Add(scene);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        DbContext.ChangeTracker.Clear();

        var saved = await DbContext
            .Scenes.Include(s => s.Items)
            .SingleAsync(s => s.Id == scene.Id, TestContext.Current.CancellationToken);

        saved.Name.Should().Be("Modo Cinema");
        saved.Icon.Should().Be("Clapperboard");
        saved.LastActivatedAt.Should().BeNull();
        saved.Items.Should().HaveCount(2);

        var lampItem = saved.Items.Single(i => i.DeviceId == lamp.Id);
        lampItem.IsOn.Should().BeTrue();
        lampItem.Brightness.Should().Be(10);
        lampItem.ColorHex.Should().Be("#FFAA00");
        lampItem.ColorTempPercent.Should().Be(30);

        var plugItem = saved.Items.Single(i => i.DeviceId == plug.Id);
        plugItem.IsOn.Should().BeFalse();
        plugItem.Brightness.Should().BeNull();
    }

    [Fact]
    public async Task SaveScene_WithSameDeviceTwice_ShouldBeBlockedByUniqueIndex()
    {
        var (user, lamp, _) = await SeedUserWithTwoDevicesAsync();

        var scene = new Scene
        {
            UserId = user.Id,
            Name = "Duplicada",
            Items =
            [
                new SceneItem { DeviceId = lamp.Id, IsOn = true },
                new SceneItem { DeviceId = lamp.Id, IsOn = false },
            ],
        };

        DbContext.Scenes.Add(scene);

        Func<Task> act = () => DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var exception = await act.Should().ThrowAsync<DbUpdateException>();
        exception
            .Which.InnerException.Should()
            .BeOfType<PostgresException>()
            .Which.SqlState.Should()
            .Be("23505", "unique_violation — (SceneId, DeviceId) não pode repetir.");
    }

    [Fact]
    public async Task DeleteUser_ViaRawSql_WithLinkedScene_ShouldBeBlockedByForeignKeyConstraint()
    {
        var (user, lamp, _) = await SeedUserWithTwoDevicesAsync();

        DbContext.Scenes.Add(
            new Scene
            {
                UserId = user.Id,
                Name = "Boa Noite",
                Items = [new SceneItem { DeviceId = lamp.Id, IsOn = false }],
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        Func<Task> act = () =>
            DbContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"Users\" WHERE \"Id\" = {0}",
                [user.Id],
                TestContext.Current.CancellationToken
            );

        var exception = await act.Should().ThrowAsync<PostgresException>();
        exception.Which.SqlState.Should().Be("23503");
    }

    [Fact]
    public async Task DeleteDevice_ViaRawSql_WithLinkedSceneItem_ShouldBeBlockedByForeignKeyConstraint()
    {
        var (user, lamp, _) = await SeedUserWithTwoDevicesAsync();

        DbContext.Scenes.Add(
            new Scene
            {
                UserId = user.Id,
                Name = "Boa Noite",
                Items = [new SceneItem { DeviceId = lamp.Id, IsOn = false }],
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        Func<Task> act = () =>
            DbContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"Devices\" WHERE \"Id\" = {0}",
                [lamp.Id],
                TestContext.Current.CancellationToken
            );

        var exception = await act.Should().ThrowAsync<PostgresException>();
        exception.Which.SqlState.Should().Be("23503");
    }

    private async Task<(User User, Device Lamp, Device Plug)> SeedUserWithTwoDevicesAsync()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            ExternalAuthUid = $"uid-scene-{Guid.NewGuid():N}",
        };

        var lamp = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Luz da Sala",
            Brand = "Sonoff",
            ExternalId = $"ext-{Guid.NewGuid():N}",
            Type = DeviceType.Light,
        };

        var plug = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Tomada TV",
            Brand = "Sonoff",
            ExternalId = $"ext-{Guid.NewGuid():N}",
            Type = DeviceType.Switch,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.AddRange(lamp, plug);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return (user, lamp, plug);
    }
}
