using com.clusterrr.TuyaNet;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Tuya;

// A maioria dos dispositivos WiFi Tuya modernos (incluindo o modelo usado para
// validar esta integração) fala protocolo local v3.3 — mesma versão assumida
// pelo TuyaUdpPacketDecoder na decodificação do broadcast de discovery.
public sealed class TuyaNetProtocolClient : ITuyaProtocolClient
{
    private const int LocalPort = 6668;
    private const int ReceiveTimeoutMs = 2500;

    public async Task<IReadOnlyDictionary<int, object?>> QueryStatusAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        CancellationToken cancellationToken
    )
    {
        using var device = CreateDevice(ipAddress, tuyaDeviceId, localKey);
        var dps = await device.GetDpsAsync(1, 0, ReceiveTimeoutMs, cancellationToken);

        return dps.ToDictionary(kv => kv.Key, object? (kv) => kv.Value);
    }

    public async Task<IReadOnlyDictionary<int, object?>> SetDpAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        int dp,
        bool value,
        CancellationToken cancellationToken
    )
    {
        using var device = CreateDevice(ipAddress, tuyaDeviceId, localKey);
        var result = await device.SetDpAsync(dp, value, 1, 0, ReceiveTimeoutMs, true, cancellationToken);

        return result.ToDictionary(kv => kv.Key, object? (kv) => kv.Value);
    }

    private static TuyaDevice CreateDevice(string ipAddress, string tuyaDeviceId, string localKey) =>
        new(ipAddress, localKey, tuyaDeviceId, TuyaProtocolVersion.V33, LocalPort, ReceiveTimeoutMs);
}
