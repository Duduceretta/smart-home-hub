using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices;

// Cobre a rede de segurança do lado da escrita pra invariante "Configuration
// sempre corresponde a IntegrationType" (ver backend/docs/architecture.md,
// seção 1.5) — Device.ChangeIntegrationType garante isso pra quem o usa, mas
// os setters continuam públicos, então qualquer divergência que escapar
// disso (ex: um Handler futuro atribuindo IntegrationType e Configuration
// separadamente) precisa ser barrada em AppDbContext.SaveChangesAsync antes
// de persistir — não só "curada" silenciosamente no próximo reload pelo
// DeviceConfigurationMaterializationInterceptor (que continua intacto, cobre
// só o lado da leitura).
public class DeviceConfigurationInvariantTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    [Fact]
    public async Task SaveChangesAsync_WhenConfigurationTypeDoesNotMatchIntegrationType_ShouldThrow()
    {
        var user = new User { Name = "Dono", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Lâmpada Tuya",
            Brand = "Tuya",
            ExternalId = $"TUYA-{Guid.NewGuid():N}",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.TuyaLocal,
            // Divergência deliberada: nunca passa por Device.ChangeIntegrationType,
            // simulando um Handler futuro que atribuísse os dois campos separadamente.
            Configuration = new NetworkDeviceConfiguration { IpAddress = "192.168.1.60" },
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);

        var act = () => DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        await act.Should()
            .ThrowAsync<InvalidOperationException>()
            .WithMessage("*ChangeIntegrationType*");
    }

    [Theory]
    [InlineData(IntegrationType.TuyaLocal)]
    [InlineData(IntegrationType.NativeMqtt)]
    [InlineData(IntegrationType.GoogleCast)]
    public async Task SaveChangesAsync_WhenConfigurationMatchesIntegrationType_ShouldPersist(
        IntegrationType integrationType
    )
    {
        var user = new User { Name = "Dono", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Dispositivo",
            Brand = "Genérica",
            ExternalId = $"DEV-{Guid.NewGuid():N}",
            Type = DeviceType.Light,
        };
        device.ChangeIntegrationType(integrationType);

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);

        var act = () => DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        await act.Should().NotThrowAsync();
    }
}
