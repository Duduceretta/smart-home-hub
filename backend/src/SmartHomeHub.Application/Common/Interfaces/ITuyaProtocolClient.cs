namespace SmartHomeHub.Application.Common.Interfaces;

// Adapter fino sobre a lib TuyaNet (protocolo local Tuya v3.3 via TCP/6668).
// Isola a API concreta do pacote do resto do código, para que o resto do
// sistema não dependa diretamente dos tipos do TuyaNet.
public interface ITuyaProtocolClient
{
    Task<IReadOnlyDictionary<int, object?>> QueryStatusAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        CancellationToken cancellationToken
    );

    Task<IReadOnlyDictionary<int, object?>> SetDpAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        int dp,
        bool value,
        CancellationToken cancellationToken
    );
}
