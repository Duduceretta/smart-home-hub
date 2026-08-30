using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Tuya;

public sealed class TuyaProtocolClientFactory(
    TuyaNetProtocolClient legacyClient,
    ILoggerFactory loggerFactory
) : ITuyaProtocolClientFactory
{
    public ITuyaProtocolClient Resolve(string? protocolVersion)
    {
        if (protocolVersion is not null && protocolVersion.StartsWith("3.5", StringComparison.Ordinal))
        {
            return new TuyaSessionProtocolClient(useGcm: true, loggerFactory.CreateLogger<TuyaSessionProtocolClient>());
        }

        if (protocolVersion is not null && protocolVersion.StartsWith("3.4", StringComparison.Ordinal))
        {
            return new TuyaSessionProtocolClient(useGcm: false, loggerFactory.CreateLogger<TuyaSessionProtocolClient>());
        }

        // null ou "3.1"/"3.3": comportamento legado, TuyaNetProtocolClient (v3.1/v3.3).
        return legacyClient;
    }
}
