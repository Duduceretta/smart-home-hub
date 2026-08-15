using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceTelemetryHistory;

public record DeviceTelemetryPointDto(
    DateTimeOffset Timestamp,
    double? PowerUsageWatts,
    double? TemperatureCelsius,
    int? Voltage,
    bool IsOn
);

public record DeviceTelemetryHistoryDto(
    Guid DeviceId,
    string DeviceName,
    IReadOnlyList<DeviceTelemetryPointDto> Points
);

public record GetDeviceTelemetryHistoryQuery(
    Guid DeviceId,
    string FirebaseUid,
    string? Range = "24h"
) : IQuery<Result<DeviceTelemetryHistoryDto>>;

public class GetDeviceTelemetryHistoryQueryValidator
    : AbstractValidator<GetDeviceTelemetryHistoryQuery>
{
    private static readonly string[] AllowedRanges = ["24h", "7d", "30d"];

    public GetDeviceTelemetryHistoryQueryValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x.Range)
            .Must(range => string.IsNullOrEmpty(range) || AllowedRanges.Contains(range.ToLower()))
            .WithMessage("O período deve ser '24h', '7d' ou '30d'.");
    }
}

public class GetDeviceTelemetryHistoryQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceTelemetryHistoryQuery, Result<DeviceTelemetryHistoryDto>>
{
    public async ValueTask<Result<DeviceTelemetryHistoryDto>> Handle(
        GetDeviceTelemetryHistoryQuery request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(user => user.ExternalAuthUid == request.FirebaseUid, cancellationToken);

        if (user == null)
            return Result.Failure<DeviceTelemetryHistoryDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == request.DeviceId && device.UserId == user.Id,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<DeviceTelemetryHistoryDto>(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão de acesso."
                )
            );

        var range = request.Range?.ToLower() ?? "24h";
        var fromDateUtc = range switch
        {
            "7d" => DateTimeOffset.UtcNow.AddDays(-7),
            "30d" => DateTimeOffset.UtcNow.AddDays(-30),
            _ => DateTimeOffset.UtcNow.AddHours(-24),
        };

        var points = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log => log.DeviceId == request.DeviceId && log.Timestamp >= fromDateUtc)
            .OrderBy(log => log.Timestamp)
            .Select(log => new DeviceTelemetryPointDto(
                log.Timestamp,
                log.PowerUsageWatts,
                log.TemperatureCelsius,
                log.Voltage,
                log.IsOn
            ))
            .ToListAsync(cancellationToken);

        var result = new DeviceTelemetryHistoryDto(device.Id, device.Name, points);

        return Result.Success(result);
    }
}
