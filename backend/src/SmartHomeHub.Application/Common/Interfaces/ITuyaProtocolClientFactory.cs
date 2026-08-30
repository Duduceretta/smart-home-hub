namespace SmartHomeHub.Application.Common.Interfaces;

// Resolve qual implementação de ITuyaProtocolClient falar com um dispositivo,
// a partir da versão de protocolo persistida em DeviceConfiguration.ProtocolVersion.
public interface ITuyaProtocolClientFactory
{
    ITuyaProtocolClient Resolve(string? protocolVersion);
}
