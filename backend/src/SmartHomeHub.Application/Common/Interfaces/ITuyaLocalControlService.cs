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
public record TuyaCommandOutcome(bool ConfirmedIsOn, string? ResolvedIpAddress, string? ResolvedDpsPowerKey);

// Mesmo racional de resolução/persistência do TuyaCommandOutcome, para brilho.
public record TuyaBrightnessCommandOutcome(string? ResolvedIpAddress, string? ResolvedDpsBrightnessKey);

// ResolvedSupportsColor só vem preenchido (true) quando o serviço confirmou o DP de
// cor respondendo com sucesso — sinal de detecção automática pra persistir em
// DeviceConfiguration.SupportsColor (só se ainda não tiver override explícito).
public record TuyaColorCommandOutcome(
    string? ResolvedIpAddress,
    string? ResolvedDpsColorKey,
    bool? ResolvedSupportsColor
);

public record TuyaColorTempCommandOutcome(string? ResolvedIpAddress, string? ResolvedDpsColorTempKey);

public record TuyaWorkModeCommandOutcome(string? ResolvedIpAddress);

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
}
