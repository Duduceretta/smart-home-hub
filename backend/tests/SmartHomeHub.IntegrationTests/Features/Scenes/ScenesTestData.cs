using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
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
        CancellationToken cancellationToken = default,
        IntegrationType integrationType = IntegrationType.TuyaLocal
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
        device.ChangeIntegrationType(integrationType);

        db.Devices.Add(device);
        await db.SaveChangesAsync(cancellationToken);
        return device;
    }

    // Dispositivo Tuya local pronto para receber comando (local_key e IP configurados),
    // com o ITuyaLocalControlService (NSubstitute) respondendo no lugar do hardware.
    public static async Task<Device> SeedTuyaDeviceAsync(
        AppDbContext db,
        Guid userId,
        DeviceType type,
        string name,
        bool isOnline = true,
        bool isOn = false,
        CancellationToken cancellationToken = default
    )
    {
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Brand = "Tuya",
            ExternalId = $"tuya-{Guid.NewGuid():N}",
            Type = type,
            IntegrationType = IntegrationType.TuyaLocal,
            Configuration = new TuyaDeviceConfiguration
            {
                IpAddress = "192.168.1.50",
                LocalKey = "local-key-123",
            },
            LiveState = new DeviceLiveState { IsOn = isOn, IsOnline = isOnline },
        };

        db.Devices.Add(device);
        await db.SaveChangesAsync(cancellationToken);
        return device;
    }

    public static async Task<Scene> SeedSceneWithItemsAsync(
        AppDbContext db,
        Guid userId,
        string name,
        List<SceneItem> items,
        CancellationToken cancellationToken = default
    )
    {
        var scene = new Scene
        {
            UserId = userId,
            Name = name,
            Items = items,
        };

        db.Scenes.Add(scene);
        await db.SaveChangesAsync(cancellationToken);
        return scene;
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
