using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Features.Dashboards.Queries.GetActivityLog;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceActivityLog;

public record GetDeviceActivityLogQuery(
    Guid DeviceId,
    string FirebaseUid,
    int Page = 1,
    int PageSize = 10
) : IQuery<Result<PagedResult<ActivityLogEntryDto>>>, IPagedQuery;

public class GetDeviceActivityLogQueryValidator : AbstractValidator<GetDeviceActivityLogQuery>
{
    public GetDeviceActivityLogQueryValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Mesmo shape (<see cref="ActivityLogEntryDto"/>) da Linha do Tempo global
/// e da versão por ambiente — aqui o filtro é direto por DeviceId, sem
/// indireção via Room, já que SystemEvent carrega o DeviceId nativamente.
/// </summary>
public class GetDeviceActivityLogQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceActivityLogQuery, Result<PagedResult<ActivityLogEntryDto>>>
{
    public async ValueTask<Result<PagedResult<ActivityLogEntryDto>>> Handle(
        GetDeviceActivityLogQuery request,
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
            return Result.Failure<PagedResult<ActivityLogEntryDto>>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == request.DeviceId && device.UserId == user.Id,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<PagedResult<ActivityLogEntryDto>>(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão de acesso."
                )
            );

        var pagedResult = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(systemEvent =>
                systemEvent.User.ExternalAuthUid == request.FirebaseUid
                && systemEvent.DeviceId == request.DeviceId
            )
            .OrderByDescending(systemEvent => systemEvent.Timestamp)
            .Select(systemEvent => new ActivityLogEntryDto(
                systemEvent.Id,
                systemEvent.DeviceId,
                systemEvent.EventType,
                systemEvent.Title,
                systemEvent.Description,
                systemEvent.Timestamp,
                systemEvent.IsAlert,
                systemEvent.TraceId
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);

        return Result.Success(pagedResult);
    }
}
