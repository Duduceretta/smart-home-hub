using FluentAssertions;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.UnitTests.Application.Common.Extensions;

public class IntegrationTypeExtensionsTests
{
    [Theory]
    [InlineData(IntegrationType.NativeMqtt)]
    [InlineData(IntegrationType.EspHomeMqtt)]
    [InlineData(IntegrationType.TuyaBridge)]
    [InlineData(IntegrationType.Zigbee)]
    public void IsNetworkProbeable_ForMqttOrCloudManagedIntegrations_ShouldReturnFalse(
        IntegrationType type
    )
    {
        type.IsNetworkProbeable().Should().BeFalse();
    }

    [Theory]
    [InlineData(IntegrationType.GoogleCast)]
    [InlineData(IntegrationType.AndroidTvAdb)]
    [InlineData(IntegrationType.TuyaLocal)]
    [InlineData(IntegrationType.LgWebOs)]
    [InlineData(IntegrationType.MdnsZeroconf)]
    [InlineData(IntegrationType.SsdpUpnp)]
    public void IsNetworkProbeable_ForLocalNetworkIntegrations_ShouldReturnTrue(
        IntegrationType type
    )
    {
        type.IsNetworkProbeable().Should().BeTrue();
    }

    [Fact]
    public void GetProbeCandidatePorts_ForGoogleCast_ShouldReturnPort8009()
    {
        IntegrationType.GoogleCast.GetProbeCandidatePorts().Should().Equal(8009);
    }

    [Fact]
    public void GetProbeCandidatePorts_ForAndroidTvAdb_ShouldReturnPort5555()
    {
        IntegrationType.AndroidTvAdb.GetProbeCandidatePorts().Should().Equal(5555);
    }

    [Fact]
    public void GetProbeCandidatePorts_ForTuyaLocal_ShouldReturnPorts6668And6667()
    {
        IntegrationType.TuyaLocal.GetProbeCandidatePorts().Should().Equal(6668, 6667);
    }

    [Fact]
    public void GetProbeCandidatePorts_ForLgWebOs_ShouldReturnPorts3000And3001()
    {
        IntegrationType.LgWebOs.GetProbeCandidatePorts().Should().Equal(3000, 3001);
    }

    [Theory]
    [InlineData(IntegrationType.MdnsZeroconf)]
    [InlineData(IntegrationType.SsdpUpnp)]
    public void GetProbeCandidatePorts_ForGenericDiscoveryIntegrations_ShouldReturnHttpPorts(
        IntegrationType type
    )
    {
        type.GetProbeCandidatePorts().Should().Equal(80, 8080);
    }

    [Theory]
    [InlineData(IntegrationType.NativeMqtt)]
    [InlineData(IntegrationType.EspHomeMqtt)]
    [InlineData(IntegrationType.TuyaBridge)]
    [InlineData(IntegrationType.Zigbee)]
    public void GetProbeCandidatePorts_ForNonProbeableIntegrations_ShouldReturnEmpty(
        IntegrationType type
    )
    {
        type.GetProbeCandidatePorts().Should().BeEmpty();
    }

    // Fonte usada tanto por IsNetworkProbeable() em memória quanto pelo
    // Where() SQL de DeviceHealthCheckWorker (via Contains, traduzível) —
    // trava que as duas leituras nunca divergem.
    [Fact]
    public void NonProbeableIntegrationTypes_ShouldMatchIsNetworkProbeableNegationForEveryValue()
    {
        foreach (var type in Enum.GetValues<IntegrationType>())
        {
            var isListedAsNonProbeable =
                IntegrationTypeExtensions.NonProbeableIntegrationTypes.Contains(type);

            isListedAsNonProbeable.Should().Be(!type.IsNetworkProbeable());
        }
    }

    [Theory]
    [InlineData(IntegrationType.GoogleCast)]
    [InlineData(IntegrationType.AndroidTvAdb)]
    public void IsAdbControllable_ForGoogleCastOrAndroidTvAdb_ShouldReturnTrue(IntegrationType type)
    {
        type.IsAdbControllable().Should().BeTrue();
    }

    [Theory]
    [InlineData(IntegrationType.LgWebOs)]
    [InlineData(IntegrationType.NativeMqtt)]
    [InlineData(IntegrationType.TuyaLocal)]
    public void IsAdbControllable_ForNonAdbIntegrations_ShouldReturnFalse(IntegrationType type)
    {
        type.IsAdbControllable().Should().BeFalse();
    }
}
