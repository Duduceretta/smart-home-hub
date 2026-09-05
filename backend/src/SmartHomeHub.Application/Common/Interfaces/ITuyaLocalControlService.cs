using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Common.Interfaces;

public record TuyaDeviceConnectionInfo(
    string TuyaDeviceId,
    string LocalKey,
    string? IpAddress,
    string? DpsPowerKey,
    string? ProtocolVersion = null,
    string? DpsBrightnessKey = null,
    string? DpsColorKey = null,
    string? DpsColorTempKey = null
);

// ConfirmedIsOn reflete o estado real relatado pelo dispositivo (não a intenção do request).
// ResolvedIpAddress/ResolvedDpsPowerKey só vêm preenchidos quando o serviço precisou
// redescobrir/deduzir esses valores durante a operação — o handler deve persistí-los
// de volta em DeviceConfiguration para as próximas chamadas não repetirem o trabalho.
public record TuyaCommandOutcome(
    bool ConfirmedIsOn,
    string? ResolvedIpAddress,
    string? ResolvedDpsPowerKey
);

// Mesmo racional de resolução/persistência do TuyaCommandOutcome, para brilho.
public record TuyaBrightnessCommandOutcome(
    string? ResolvedIpAddress,
    string? ResolvedDpsBrightnessKey
);

// ResolvedSupportsColor só vem preenchido (true) quando o serviço confirmou o DP de
// cor respondendo com sucesso — sinal de detecção automática pra persistir em
// DeviceConfiguration.SupportsColor (só se ainda não tiver override explícito).
public record TuyaColorCommandOutcome(
    string? ResolvedIpAddress,
    string? ResolvedDpsColorKey,
    bool? ResolvedSupportsColor
);

public record TuyaColorTempCommandOutcome(
    string? ResolvedIpAddress,
    string? ResolvedDpsColorTempKey
);

public record TuyaWorkModeCommandOutcome(string? ResolvedIpAddress);

// Mesmo racional de resolução/persistência dos outros outcomes — usado pelo
// polling de sincronização de estado externo (interruptor físico/app), não
// por um comando de escrita. BrightnessPercent/ColorHex/ColorTempPercent vêm
// null quando o dispositivo não resolveu o DP correspondente (categoria sem
// esse atributo, ex: uma tomada simples não tem DP de cor/brilho) — não é
// erro, é "não aplicável pra este dispositivo".
public record TuyaPollingOutcome(
    bool IsOn,
    int? BrightnessPercent,
    string? ColorHex,
    int? ColorTempPercent,
    string? ResolvedIpAddress,
    string? ResolvedDpsPowerKey
);

public interface ITuyaLocalControlService
{
    Task<Result<TuyaCommandOutcome>> SetPowerStateAsync(
        TuyaDeviceConnectionInfo connection,
        bool desiredState,
        CancellationToken cancellationToken
    );

    Task<Result<TuyaBrightnessCommandOutcome>> SetBrightnessAsync(
        TuyaDeviceConnectionInfo connection,
        int brightnessPercent,
        CancellationToken cancellationToken
    );

    Task<Result<TuyaColorCommandOutcome>> SetColorAsync(
        TuyaDeviceConnectionInfo connection,
        string colorHex,
        CancellationToken cancellationToken
    );

    Task<Result<TuyaColorTempCommandOutcome>> SetColorTempAsync(
        TuyaDeviceConnectionInfo connection,
        int colorTempPercent,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Seta o DP de work_mode diretamente (sem tocar brilho/cor) — usado pra
    /// trocar as abas "Branco"/"Cor" no front-end, espelhando o app Smart
    /// Life (a troca de aba é uma ação real no dispositivo, não só UI).
    /// </summary>
    Task<Result<TuyaWorkModeCommandOutcome>> SetWorkModeAsync(
        TuyaDeviceConnectionInfo connection,
        string workMode,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lê o work_mode atual (sem setar nada) — usado pra abrir o painel de
    /// detalhe já na aba certa (Branco/Cor), refletindo o estado real do
    /// dispositivo em vez de assumir um padrão fixo.
    /// </summary>
    Task<Result<string?>> GetWorkModeAsync(
        TuyaDeviceConnectionInfo connection,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lê o estado completo (liga/desliga + brilho/cor/temperatura de cor,
    /// quando aplicável) pra sincronização periódica (polling) de mudanças
    /// externas (interruptor físico, app SmartLife) — não um comando de
    /// escrita. Adquire o MESMO lock por dispositivo do caminho de escrita,
    /// mas com um timeout de aquisição bem mais curto: uma consulta de
    /// polling nunca deve esperar por um comando de usuário em andamento,
    /// deve desistir rápido (Device.Busy) e deixar o próximo ciclo tentar de
    /// novo, já que não é uma leitura crítica.
    /// </summary>
    Task<Result<TuyaPollingOutcome>> GetStateForPollingAsync(
        TuyaDeviceConnectionInfo connection,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Realiza a limpeza de sessões TCP inativas expiradas em nível de protocolo (sweep periódico).
    /// </summary>
    void PruneExpiredSessions();
}
