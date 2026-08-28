using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRoomClimate;

/// <summary>
/// HasClimateSensor=false = o ambiente não tem nenhum dispositivo
/// Sensor/Termostato — o front-end omite a seção de KPI sem ambiguidade.
/// HasClimateSensor=true com TemperatureCelsius/HumidityPercent=null = tem
/// sensor cadastrado, mas ele ainda não reportou nenhuma leitura daquela
/// grandeza específica (o hardware pode reportar só uma das duas).
/// </summary>
public record RoomClimateResponseDto(
    bool HasClimateSensor,
    double? TemperatureCelsius,
    double? HumidityPercent,
    DateTimeOffset? ReadingTimestampUtc
);

public record GetRoomClimateQuery(Guid RoomId, string FirebaseUid)
    : IQuery<Result<RoomClimateResponseDto>>;

public class GetRoomClimateQueryValidator : AbstractValidator<GetRoomClimateQuery>
{
    public GetRoomClimateQueryValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty().WithMessage("O ID do ambiente é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// "Mais recente entre todos" foi a agregação escolhida (em vez de média
/// entre múltiplos sensores) — é a leitura correta com um único sensor por
/// ambiente (caso comum hoje) e não corre o risco de misturar sensores
/// fisicamente distantes numa média que não representa nenhum ponto real
/// da casa. Temperatura e umidade vêm da MESMA linha de telemetria (mais
/// recente entre as duas grandezas) — não busca a mais recente de cada uma
/// separadamente, pra sempre refletir uma leitura coerente de um instante
/// só do sensor.
/// </summary>
public class GetRoomClimateQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomClimateQuery, Result<RoomClimateResponseDto>>
{
    public async ValueTask<Result<RoomClimateResponseDto>> Handle(
        GetRoomClimateQuery request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (user == null)
            return Result.Failure<RoomClimateResponseDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var room = await dbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == request.RoomId && room.UserId == user.Id,
                cancellationToken
            );

        if (room == null)
            return Result.Failure<RoomClimateResponseDto>(
                new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso.")
            );

        var sensorDeviceIds = await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.RoomId == request.RoomId
                && device.UserId == user.Id
                && !device.IsDeleted
                && (device.Type == DeviceType.Sensor || device.Type == DeviceType.Thermostat)
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (sensorDeviceIds.Count == 0)
            return Result.Success(new RoomClimateResponseDto(false, null, null, null));

        var latestReading = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                sensorDeviceIds.Contains(log.DeviceId)
                && (log.TemperatureCelsius.HasValue || log.HumidityPercent.HasValue)
            )
            .OrderByDescending(log => log.Timestamp)
            .Select(log => new
            {
                log.Timestamp,
                log.TemperatureCelsius,
                log.HumidityPercent,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return Result.Success(
            new RoomClimateResponseDto(
                true,
                latestReading?.TemperatureCelsius,
                latestReading?.HumidityPercent,
                latestReading?.Timestamp
            )
        );
    }
}
