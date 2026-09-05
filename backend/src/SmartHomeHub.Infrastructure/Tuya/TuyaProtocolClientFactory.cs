using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Tuya;

public sealed class TuyaProtocolClientFactory(
    TuyaNetProtocolClient legacyClient,
    ILoggerFactory loggerFactory
) : ITuyaProtocolClientFactory, IDisposable, IAsyncDisposable
{
    private readonly TuyaSessionProtocolClient _v35Client = new(
        useGcm: true,
        loggerFactory.CreateLogger<TuyaSessionProtocolClient>()
    );

    private readonly TuyaSessionProtocolClient _v34Client = new(
        useGcm: false,
        loggerFactory.CreateLogger<TuyaSessionProtocolClient>()
    );

    /// <summary>
    /// Resolve o client de protocolo Tuya correto pra versão informada.
    /// v3.4/v3.5 têm branch dedicado (sessão própria, HMAC-SHA256+AES-ECB ou
    /// AES-GCM) com cache persistente de conexão TCP. Qualquer outro valor — <c>null</c>, "3.1", "3.2", "3.3" —
    /// cai no mesmo <see cref="TuyaNetProtocolClient"/> legado, que internamente
    /// sempre usa <c>TuyaProtocolVersion.V33</c> com conexão efêmera por comando. Isso é intencional, não uma
    /// lacuna: v3.1/v3.2/v3.3 compartilham o mesmo esquema de criptografia
    /// (AES-128-ECB sem sessão/HMAC/GCM) e o mesmo formato de frame — não há
    /// diferença de wire protocol nesse range que justifique um branch próprio.
    /// Ver <c>backend/docs/iot-drivers.md</c>, seção "Driver Local Tuya (TCP)",
    /// para o racional completo antes de "corrigir" isso numa auditoria futura.
    /// </summary>
    public ITuyaProtocolClient Resolve(string? protocolVersion)
    {
        if (
            protocolVersion is not null
            && protocolVersion.StartsWith("3.5", StringComparison.Ordinal)
        )
        {
            return _v35Client;
        }

        if (
            protocolVersion is not null
            && protocolVersion.StartsWith("3.4", StringComparison.Ordinal)
        )
        {
            return _v34Client;
        }

        // null ou "3.1"/"3.3": comportamento legado, TuyaNetProtocolClient (v3.1/v3.3).
        return legacyClient;
    }

    public void Dispose()
    {
        _v35Client.Dispose();
        _v34Client.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        await _v35Client.DisposeAsync();
        await _v34Client.DisposeAsync();
    }
}
