using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using Xunit;

namespace SmartHomeHub.UnitTests.Domain.Entities;

public class DeviceTests
{
    [Theory]
    [InlineData(IntegrationType.TuyaLocal, typeof(TuyaDeviceConfiguration))]
    [InlineData(IntegrationType.NativeMqtt, typeof(MqttDeviceConfiguration))]
    [InlineData(IntegrationType.EspHomeMqtt, typeof(MqttDeviceConfiguration))]
    [InlineData(IntegrationType.GoogleCast, typeof(NetworkDeviceConfiguration))]
    [InlineData(IntegrationType.LgWebOs, typeof(NetworkDeviceConfiguration))]
    [InlineData(IntegrationType.AndroidTvAdb, typeof(NetworkDeviceConfiguration))]
    [InlineData(IntegrationType.TuyaBridge, typeof(NetworkDeviceConfiguration))]
    [InlineData(IntegrationType.Zigbee, typeof(NetworkDeviceConfiguration))]
    [InlineData(IntegrationType.MdnsZeroconf, typeof(NetworkDeviceConfiguration))]
    [InlineData(IntegrationType.SsdpUpnp, typeof(NetworkDeviceConfiguration))]
    public void ChangeIntegrationType_ShouldAlwaysResetConfigurationToMatchingCategory(
        IntegrationType newType,
        Type expectedConfigurationType
    )
    {
        // Parte de um device já num protocolo diferente do testado, com
        // Configuration correspondente já preenchida — prova que a troca
        // descarta o estado antigo, não só troca o tipo declarado.
        var device = new Device
        {
            IntegrationType = IntegrationType.NativeMqtt,
            Configuration = new MqttDeviceConfiguration { ClientKey = "old-client-key" },
        };

        device.ChangeIntegrationType(newType);

        device.IntegrationType.Should().Be(newType);
        device.Configuration.Should().BeOfType(expectedConfigurationType);
    }

    [Fact]
    public void ChangeIntegrationType_ToSameType_ShouldNotReplaceConfigurationInstance()
    {
        var configuration = new TuyaDeviceConfiguration { LocalKey = "local-key-123" };
        var device = new Device
        {
            IntegrationType = IntegrationType.TuyaLocal,
            Configuration = configuration,
        };

        device.ChangeIntegrationType(IntegrationType.TuyaLocal);

        device.Configuration.Should().BeSameAs(configuration);
        ((TuyaDeviceConfiguration)device.Configuration).LocalKey.Should().Be("local-key-123");
    }

    [Fact]
    public void ChangeIntegrationType_ToDifferentType_ShouldDiscardPreviousConfigurationFields()
    {
        var device = new Device
        {
            IntegrationType = IntegrationType.TuyaLocal,
            Configuration = new TuyaDeviceConfiguration
            {
                LocalKey = "local-key-123",
                IpAddress = "192.168.1.60",
            },
        };

        device.ChangeIntegrationType(IntegrationType.NativeMqtt);

        var mqttConfiguration = device
            .Configuration.Should()
            .BeOfType<MqttDeviceConfiguration>()
            .Subject;
        mqttConfiguration.ClientKey.Should().BeNull();
        mqttConfiguration.IpAddress.Should().BeNull();
    }
}
