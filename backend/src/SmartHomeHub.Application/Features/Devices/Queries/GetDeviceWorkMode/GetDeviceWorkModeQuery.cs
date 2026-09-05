using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceWorkMode;

/// <summary>
/// WorkMode null = dispositivo não expõe DP de modo (ou não é um Tuya
/// local) — o front-end trata como "sem abas Branco/Cor pra mostrar".
/// </summary>
public record DeviceWorkModeResponseDto(string? WorkMode);

public record GetDeviceWorkModeQuery(Guid DeviceId, string FirebaseUid)
    : IQuery<Result<DeviceWorkModeResponseDto>>;

public class GetDeviceWorkModeQueryValidator : AbstractValidator<GetDeviceWorkModeQuery>
{
    public GetDeviceWorkModeQueryValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Consulta síncrona ao hardware real (sem cache) — usada só na abertura do
/// painel de detalhe, pra refletir a aba correta (Branco/Cor) sem assumir
/// um padrão fixo. Falha de comunicação com o dispositivo não é tratada
/// como erro — devolve WorkMode=null, deixando o front-end cair num
/// fallback razoável em vez de quebrar o resto do painel.
/// </summary>
public class GetDeviceWorkModeQueryHandler(
    IAppDbContext dbContext,
    ITuyaLocalControlService tuyaLocalControlService
) : IQueryHandler<GetDeviceWorkModeQuery, Result<DeviceWorkModeResponseDto>>
{
    public async ValueTask<Result<DeviceWorkModeResponseDto>> Handle(
        GetDeviceWorkModeQuery request,
        CancellationToken cancellationToken
    )
    {
        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                d => d.Id == request.DeviceId && d.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<DeviceWorkModeResponseDto>(
                new Error("Device.NotFound", "Dispositivo não encontrado.")
            );

        if (device.Type != DeviceType.Light || device.IntegrationType != IntegrationType.TuyaLocal)
            return Result.Success(new DeviceWorkModeResponseDto(null));

        // Consulta tolerante (ver doc do handler): tipo de Configuration
        // incompatível com IntegrationType=TuyaLocal aqui é tratado como
        // "sem work mode pra mostrar", não como bug fatal — ao contrário dos
        // Commands que efetivamente operam o hardware Tuya (esses falham
        // alto com exceção, nunca silenciosamente).
        if (
            device.Configuration is not TuyaDeviceConfiguration tuyaConfig
            || string.IsNullOrWhiteSpace(tuyaConfig.LocalKey)
        )
            return Result.Success(new DeviceWorkModeResponseDto(null));

        var connection = new TuyaDeviceConnectionInfo(
            device.ExternalId,
            tuyaConfig.LocalKey,
            tuyaConfig.IpAddress,
            tuyaConfig.DpsPowerKey,
            tuyaConfig.ProtocolVersion
        );

        var tuyaResult = await tuyaLocalControlService.GetWorkModeAsync(
            connection,
            cancellationToken
        );

        return Result.Success(
            new DeviceWorkModeResponseDto(tuyaResult.IsSuccess ? tuyaResult.Value : null)
        );
    }
}
