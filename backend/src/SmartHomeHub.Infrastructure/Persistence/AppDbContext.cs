using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Interfaces;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options),
        IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<DeviceLiveState> DeviceLiveStates => Set<DeviceLiveState>();
    public DbSet<DeviceGroup> DeviceGroups => Set<DeviceGroup>();
    public DbSet<DeviceTelemetryLog> DeviceTelemetryLogs => Set<DeviceTelemetryLog>();
    public DbSet<SystemEvent> SystemEvents => Set<SystemEvent>();
    public DbSet<SpotifyIntegration> SpotifyIntegrations => Set<SpotifyIntegration>();
    public DbSet<Automation> Automations => Set<Automation>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Rede de segurança do lado da escrita para a invariante "Configuration
        // sempre corresponde a IntegrationType" (ver backend/docs/architecture.md,
        // seção 1.5). Device.ChangeIntegrationType já garante isso pra quem o usa,
        // mas os setters de IntegrationType/Configuration continuam públicos (EF
        // Core e o DeviceConfigurationMaterializationInterceptor precisam deles) —
        // então qualquer código futuro que atribua os dois separadamente, sem
        // passar por ChangeIntegrationType, é barrado aqui antes de persistir,
        // em vez de só ser "curado" silenciosamente no próximo reload pelo
        // interceptor de leitura.
        foreach (var entry in ChangeTracker.Entries<Device>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified))
                continue;

            var device = entry.Entity;
            var expectedType = DeviceConfigurationTypeResolver.Resolve(device.IntegrationType);

            if (device.Configuration.GetType() != expectedType)
            {
                throw new InvalidOperationException(
                    $"Device {device.Id} tem IntegrationType={device.IntegrationType} mas "
                        + $"Configuration é {device.Configuration.GetType().Name} (esperado "
                        + $"{expectedType.Name}). Use Device.ChangeIntegrationType(...) para trocar "
                        + "de protocolo — nunca atribua IntegrationType e Configuration separadamente."
                );
            }
        }

        var nowUtc = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = nowUtc;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = nowUtc;
            }
        }

        foreach (var entry in ChangeTracker.Entries<ISoftDeletable>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = nowUtc;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder
            .Properties<DateTimeOffset>()
            .HaveConversion<Converters.UtcDateTimeOffsetConverter>();
        configurationBuilder
            .Properties<DateTimeOffset?>()
            .HaveConversion<Converters.UtcDateTimeOffsetConverter>();
    }
}
