using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Room> Rooms { get; }
    DbSet<Device> Devices { get; }
    DbSet<DeviceGroup> DeviceGroups { get; }
    DbSet<DeviceTelemetryLog> DeviceTelemetryLogs { get; }
    DbSet<SystemEvent> SystemEvents { get; }
    DbSet<SpotifyIntegration> SpotifyIntegrations { get; }
    DbSet<Automation> Automations { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
