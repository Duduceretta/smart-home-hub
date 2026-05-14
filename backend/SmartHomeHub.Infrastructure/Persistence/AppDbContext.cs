using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<DeviceGroup> DeviceGroups => Set<DeviceGroup>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}