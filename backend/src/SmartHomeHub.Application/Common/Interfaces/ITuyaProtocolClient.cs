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

    // Escrita de múltiplos DPs de tipos mistos (bool/int/string) numa única
    // mensagem — necessário pra cor (DP de work_mode="colour" + DP de
    // colour_data juntos) e brilho (DP numérico). SetDpAsync(bool) acima
    // continua existindo só pra não quebrar o call-site já validado do
    // toggle de power; implementações podem defini-lo em termos deste.
    Task<IReadOnlyDictionary<int, object?>> SetDpsAsync(
        string ipAddress,
        string tuyaDeviceId,
        string localKey,
        IReadOnlyDictionary<int, object> dps,
        CancellationToken cancellationToken
    );
}
