using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Common.Interfaces;

public record TuyaDeviceConnectionInfo(
    string TuyaDeviceId,
    string LocalKey,
    string? IpAddress,
    string? DpsPowerKey,
    string? ProtocolVersion = null
);

// ConfirmedIsOn reflete o estado real relatado pelo dispositivo (não a intenção do request).
// ResolvedIpAddress/ResolvedDpsPowerKey só vêm preenchidos quando o serviço precisou
// redescobrir/deduzir esses valores durante a operação — o handler deve persistí-los
// de volta em DeviceConfiguration para as próximas chamadas não repetirem o trabalho.
public record TuyaCommandOutcome(bool ConfirmedIsOn, string? ResolvedIpAddress, string? ResolvedDpsPowerKey);

public interface ITuyaLocalControlService
{
    Task<Result<TuyaCommandOutcome>> SetPowerStateAsync(
        TuyaDeviceConnectionInfo connection,
        bool desiredState,
        CancellationToken cancellationToken
    );
}
