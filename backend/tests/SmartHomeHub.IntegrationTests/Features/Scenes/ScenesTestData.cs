using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.IntegrationTests.Features.Scenes;

// Corpo aceito por POST /api/scenes e PUT /api/scenes/{id}.
internal record SceneItemRequest(
    Guid DeviceId,
    bool IsOn,
    int? Brightness = null,
    string? ColorHex = null,
    int? ColorTempPercent = null
);

internal record SceneRequest(string Name, string? Icon, List<SceneItemRequest> Items);

internal static class ScenesTestData
{
    // Mesmo uid que o TestAuthHandler injeta como "user_id" em toda requisição.
    public const string LoggedFirebaseUid = "firebase-token-123";

    public static async Task<User> SeedUserAsync(
        AppDbContext db,
        string? firebaseUid = null,
        CancellationToken cancellationToken = default
    )
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo",
            Email = $"{Guid.NewGuid():N}@hub.com",
            ExternalAuthUid = firebaseUid ?? $"other-uid-{Guid.NewGuid():N}",
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user;
    }

    public static async Task<Device> SeedDeviceAsync(
        AppDbContext db,
        Guid userId,
        DeviceType type = DeviceType.Light,
        string name = "Dispositivo",
        CancellationToken cancellationToken = default
    )
    {
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Brand = "Tuya",
            ExternalId = $"ext-{Guid.NewGuid():N}",
            Type = type,
        };

        db.Devices.Add(device);
        await db.SaveChangesAsync(cancellationToken);
        return device;
    }

    public static async Task<Scene> SeedSceneAsync(
        AppDbContext db,
        Guid userId,
        string name,
        IEnumerable<(Device Device, bool IsOn)> items,
        CancellationToken cancellationToken = default
    )
    {
        var scene = new Scene
        {
            UserId = userId,
            Name = name,
            Items = items
                .Select(item => new SceneItem { DeviceId = item.Device.Id, IsOn = item.IsOn })
                .ToList(),
        };

        db.Scenes.Add(scene);
        await db.SaveChangesAsync(cancellationToken);
        return scene;
    }
}
