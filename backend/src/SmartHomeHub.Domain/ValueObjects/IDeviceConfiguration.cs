namespace SmartHomeHub.Domain.ValueObjects;

/// <summary>
/// Tipo concreto escolhido a partir de Device.IntegrationType (ver
/// <see cref="DeviceConfigurationTypeResolver"/>), nunca de um discriminador
/// embutido no próprio JSON — a coluna relacional já existente é a única
/// fonte de verdade sobre qual subtipo materializar, evitando duas fontes
/// de verdade que podem divergir.
///
/// <c>IpAddress</c> é o único campo genuinamente universal entre as três
/// categorias hoje existentes (Tuya local, MQTT nativo e integrações de
/// rede genéricas/TV) — MQTT recebe o IP via telemetria (ProcessTelemetryCommand)
/// mesmo não sendo "network probeable", só para exibição/diagnóstico. Por
/// isso ele mora na interface base; os demais campos (MacAddress, chaves
/// Tuya, tópicos MQTT) são específicos de subconjuntos de protocolos e
/// vivem em <see cref="INetworkAddressableConfiguration"/> ou direto nos
/// tipos concretos.
/// </summary>
public interface IDeviceConfiguration
{
    string? IpAddress { get; set; }
}
