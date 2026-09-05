using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.Infrastructure.Persistence.Conversions;
using Xunit;

namespace SmartHomeHub.UnitTests.Infrastructure.Persistence.Conversions;

public class DeviceConfigurationJsonSerializerTests
{
    // --------------------------------------------------------------
    // Round-trip: serializar e deserializar de volta preserva todos os campos.
    // --------------------------------------------------------------

    [Fact]
    public void RoundTrip_TuyaDeviceConfiguration_ShouldPreserveAllFields()
    {
        var original = new TuyaDeviceConfiguration
        {
            IpAddress = "192.168.1.60",
            MacAddress = "AA:BB:CC:DD:EE:FF",
            LocalKey = "local-key-123",
            ProtocolVersion = "3.4",
            DpsPowerKey = "1",
            DpsBrightnessKey = "22",
            DpsColorKey = "24",
            DpsColorTempKey = "23",
            SupportsColor = true,
        };

        var json = DeviceConfigurationJsonSerializer.Serialize(original);
        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            DeviceConfigurationJsonSerializer.DeserializeRaw(json),
            IntegrationType.TuyaLocal
        );

        resolved.Should().BeOfType<TuyaDeviceConfiguration>();
        resolved.Should().BeEquivalentTo(original);
    }

    [Fact]
    public void RoundTrip_MqttDeviceConfiguration_ShouldPreserveAllFields()
    {
        var original = new MqttDeviceConfiguration
        {
            IpAddress = "192.168.1.90",
            ClientKey = "client-key-abc",
            CommandTopic = "home/commands/sonoff-1",
            StateTopic = "home/telemetry/sonoff-1",
        };

        var json = DeviceConfigurationJsonSerializer.Serialize(original);
        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            DeviceConfigurationJsonSerializer.DeserializeRaw(json),
            IntegrationType.NativeMqtt
        );

        resolved.Should().BeOfType<MqttDeviceConfiguration>();
        resolved.Should().BeEquivalentTo(original);
    }

    [Fact]
    public void RoundTrip_NetworkDeviceConfiguration_ShouldPreserveAllFields()
    {
        var original = new NetworkDeviceConfiguration
        {
            IpAddress = "192.168.1.211",
            MacAddress = "11:22:33:44:55:66",
        };

        var json = DeviceConfigurationJsonSerializer.Serialize(original);
        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            DeviceConfigurationJsonSerializer.DeserializeRaw(json),
            IntegrationType.AndroidTvAdb
        );

        resolved.Should().BeOfType<NetworkDeviceConfiguration>();
        resolved.Should().BeEquivalentTo(original);
    }

    // --------------------------------------------------------------
    // Compatibilidade retroativa: o JSONB antigo era um único blob com TODOS
    // os campos (Tuya + MQTT + rede) juntos, gravado pelo extinto
    // OwnsOne(...).ToJson() do EF Core sobre a classe única DeviceConfiguration
    // — nomes de propriedade em PascalCase, iguais aos usados aqui. Testa que
    // o novo modelo tipado deserializa esse formato real sem perda de dado,
    // ignorando os campos irrelevantes para a categoria resolvida.
    // --------------------------------------------------------------

    private const string LegacyTuyaDeviceJson = """
        {
          "IpAddress": "192.168.1.60",
          "MacAddress": null,
          "LocalKey": "local-key-123",
          "ProtocolVersion": "3.4",
          "DpsPowerKey": "20",
          "DpsBrightnessKey": "22",
          "DpsColorKey": "24",
          "DpsColorTempKey": "23",
          "ClientKey": null,
          "CommandTopic": null,
          "StateTopic": null,
          "SupportsColor": true
        }
        """;

    private const string LegacyMqttDeviceJson = """
        {
          "IpAddress": "192.168.1.90",
          "MacAddress": null,
          "LocalKey": null,
          "ProtocolVersion": null,
          "DpsPowerKey": "20",
          "DpsBrightnessKey": "22",
          "DpsColorKey": "24",
          "DpsColorTempKey": "23",
          "ClientKey": "client-key-abc",
          "CommandTopic": "home/commands/sonoff-1",
          "StateTopic": "home/telemetry/sonoff-1",
          "SupportsColor": null
        }
        """;

    [Fact]
    public void Resolve_LegacyTuyaJsonPreRefactor_ShouldDeserializeWithoutDataLoss()
    {
        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            DeviceConfigurationJsonSerializer.DeserializeRaw(LegacyTuyaDeviceJson),
            IntegrationType.TuyaLocal
        );

        var tuya = resolved.Should().BeOfType<TuyaDeviceConfiguration>().Subject;
        tuya.IpAddress.Should().Be("192.168.1.60");
        tuya.LocalKey.Should().Be("local-key-123");
        tuya.ProtocolVersion.Should().Be("3.4");
        tuya.DpsPowerKey.Should().Be("20");
        tuya.DpsBrightnessKey.Should().Be("22");
        tuya.DpsColorKey.Should().Be("24");
        tuya.DpsColorTempKey.Should().Be("23");
        tuya.SupportsColor.Should().BeTrue();
    }

    [Fact]
    public void Resolve_LegacyMqttJsonPreRefactor_ShouldDeserializeWithoutDataLoss()
    {
        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            DeviceConfigurationJsonSerializer.DeserializeRaw(LegacyMqttDeviceJson),
            IntegrationType.NativeMqtt
        );

        var mqtt = resolved.Should().BeOfType<MqttDeviceConfiguration>().Subject;
        mqtt.IpAddress.Should().Be("192.168.1.90");
        mqtt.ClientKey.Should().Be("client-key-abc");
        mqtt.CommandTopic.Should().Be("home/commands/sonoff-1");
        mqtt.StateTopic.Should().Be("home/telemetry/sonoff-1");
    }

    [Fact]
    public void Resolve_LegacyNetworkJsonPreRefactor_ShouldDeserializeWithoutDataLoss()
    {
        const string legacyTvJson = """
            {
              "IpAddress": "192.168.1.150",
              "MacAddress": "AA:BB:CC:DD:EE:FF",
              "LocalKey": null,
              "ProtocolVersion": null,
              "DpsPowerKey": "20",
              "DpsBrightnessKey": "22",
              "DpsColorKey": "24",
              "DpsColorTempKey": "23",
              "ClientKey": null,
              "CommandTopic": null,
              "StateTopic": null,
              "SupportsColor": null
            }
            """;

        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            DeviceConfigurationJsonSerializer.DeserializeRaw(legacyTvJson),
            IntegrationType.GoogleCast
        );

        var network = resolved.Should().BeOfType<NetworkDeviceConfiguration>().Subject;
        network.IpAddress.Should().Be("192.168.1.150");
        network.MacAddress.Should().Be("AA:BB:CC:DD:EE:FF");
    }

    // --------------------------------------------------------------
    // Uma entidade nova (ainda não passou pelo banco) já carrega o tipo
    // concreto certo — Resolve deve devolvê-la inalterada, sem tentar
    // reinterpretar como RawDeviceConfiguration.
    // --------------------------------------------------------------
    [Fact]
    public void Resolve_AlreadyConcreteInstance_ShouldReturnSameInstance()
    {
        IDeviceConfiguration configuration = new TuyaDeviceConfiguration { LocalKey = "abc" };

        var resolved = DeviceConfigurationJsonSerializer.Resolve(
            configuration,
            IntegrationType.TuyaLocal
        );

        resolved.Should().BeSameAs(configuration);
    }
}
