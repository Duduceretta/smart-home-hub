using System.Security.Claims;
using Mediator;
using Microsoft.AspNetCore.Mvc;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;
using SmartHomeHub.Application.Features.Devices.Commands.DeleteDevice;
using SmartHomeHub.Application.Features.Devices.Commands.ToggleDevice;
using SmartHomeHub.Application.Features.Devices.Commands.UpdateDevice;
using SmartHomeHub.Application.Features.Devices.Queries.GetDeviceById;
using SmartHomeHub.Application.Features.Devices.Queries.GetDevices;
using SmartHomeHub.Application.Features.Devices.Queries.GetDeviceTelemetryHistory;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Api.Endpoints;

public static class DeviceEndpoints
{
    public static void MapDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/devices",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    [FromQuery(Name = "q")] string? queryParam = null,
                    [FromQuery] string? category = null,
                    [FromQuery] string? status = null,
                    [FromQuery] Guid? roomId = null,
                    [FromQuery] bool? onlyOn = null,
                    [FromQuery] int page = 1,
                    [FromQuery] int pageSize = 10
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetDevicesQuery(
                        firebaseUid,
                        queryParam,
                        category,
                        status,
                        roomId,
                        onlyOn,
                        page,
                        pageSize
                    );

                    var devices = await mediator.Send(query, cancellationToken);

                    return Results.Ok(devices);
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Lista todos os dispositivos com filtros e paginação")
            .WithDescription(
                "Retorna uma lista paginada dos dispositivos ativos associados ao usuário autenticado, permitindo filtragem por busca textual (q), categoria, status (online/offline), cômodo (roomId) e apenas ligados (onlyOn)."
            )
            .Produces<PagedResult<DeviceDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/devices/{id:guid}",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetDeviceByIdQuery(id, firebaseUid);
                    var device = await mediator.Send(query, cancellationToken);

                    return device is not null ? Results.Ok(device) : Results.NotFound();
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Busca um dispositivo por ID")
            .WithDescription(
                "Retorna os detalhes completos de um dispositivo específico. Retorna **404 Not Found** se o dispositivo não existir ou não pertencer ao usuário."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapGet(
                "/api/devices/{id:guid}/telemetry",
                async (
                    Guid id,
                    [FromQuery] string? range,
                    IMediator mediator,
                    ClaimsPrincipal claimsPrincipal,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = claimsPrincipal.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetDeviceTelemetryHistoryQuery(id, firebaseUid, range);
                    var result = await mediator.Send(query, cancellationToken);

                    return result.IsSuccess
                        ? Results.Ok(result.Value)
                        : Results.Problem(
                            statusCode: StatusCodes.Status404NotFound,
                            title: result.Error.Code,
                            detail: result.Error.Description
                        );
                }
            )
            .RequireAuthorization()
            .WithTags("⚡ Dispositivos")
            .WithSummary("Obtém histórico de telemetria do dispositivo")
            .WithDescription(
                "Retorna os pontos temporais de telemetria (Watts, Temperatura, Voltagem) filtrados pelo período (24h, 7d, 30d)."
            )
            .Produces<DeviceTelemetryHistoryDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapPost(
                "/api/devices",
                async (
                    CreateDeviceRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new CreateDeviceCommand(
                        request.Name,
                        request.Brand,
                        request.ExternalId,
                        request.Type,
                        request.IntegrationType,
                        request.RoomId,
                        firebaseUid,
                        request.IpAddress,
                        request.MacAddress,
                        request.LocalKey,
                        request.DpsPowerKey,
                        request.ClientKey
                    );

                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Created(
                        $"/api/devices/{result.Value}",
                        new
                        {
                            message = "Dispositivo registrado com sucesso!",
                            deviceId = result.Value,
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Cria um novo dispositivo")
            .WithDescription(
                "Registra um novo hardware IoT no sistema e o vincula ao usuário autenticado. Pode ser opcionalmente alocado em um Ambiente (`RoomId`)."
            )
            .Produces<object>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapPost(
                "/api/devices/{id:guid}/toggle",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new ToggleDeviceCommand(id, firebaseUid);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { message = "Comando enviado com sucesso." });
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Alterna o estado do dispositivo (Toggle)")
            .WithDescription(
                "Inverte o estado atual (`IsOn`) do dispositivo no banco de dados e dispara automaticamente um comando para atualizar o hardware físico."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPut(
                "/api/devices/{id:guid}",
                async (
                    Guid id,
                    UpdateDeviceRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new UpdateDeviceCommand(
                        id,
                        request.Name,
                        request.Brand,
                        request.ExternalId,
                        request.Type,
                        request.IntegrationType,
                        request.RoomId,
                        firebaseUid,
                        request.IpAddress,
                        request.MacAddress,
                        request.LocalKey,
                        request.DpsPowerKey,
                        request.ClientKey
                    );

                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(
                        new
                        {
                            id = id,
                            name = request.Name,
                            brand = request.Brand,
                            externalId = request.ExternalId,
                            type = request.Type,
                            integrationType = request.IntegrationType,
                            roomId = request.RoomId,
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Atualiza um dispositivo existente")
            .WithDescription(
                "Substitui os dados cadastrais do dispositivo. A alteração de `RoomId` transfere o dispositivo de ambiente."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapDelete(
                "/api/devices/{id:guid}",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new DeleteDeviceCommand(id, firebaseUid);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Deleta um dispositivo (Soft Delete)")
            .WithDescription(
                "Remove o dispositivo do acesso do usuário (Soft Delete). As telemetrias históricas e o registro físico são mantidos no banco para auditoria."
            )
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost(
                "/api/devices/discovery/start",
                async (
                    StartDiscoveryRequest request,
                    ClaimsPrincipal userToken,
                    IDeviceDiscoveryManager discoveryManager,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    await discoveryManager.StartDiscoveryAsync(
                        firebaseUid,
                        request.TimeoutSeconds,
                        CancellationToken.None
                    );

                    return Results.Accepted();
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Inicia a descoberta automática de dispositivos (fallback REST)")
            .WithDescription(
                "Alternativa ao método StartDiscovery do Hub SignalR /hubs/telemetry para clientes sem suporte a WebSocket. Os achados são notificados exclusivamente via evento 'DeviceDiscovered' do SignalR — este endpoint apenas inicia a varredura."
            )
            .Produces(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapPost(
                "/api/devices/discovery/stop",
                async (ClaimsPrincipal userToken, IDeviceDiscoveryManager discoveryManager) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    await discoveryManager.StopDiscoveryAsync(firebaseUid);

                    return Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Interrompe a descoberta automática de dispositivos em andamento")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}

public record CreateDeviceRequest(
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    IntegrationType IntegrationType,
    Guid? RoomId = null,
    string? IpAddress = null,
    string? MacAddress = null,
    string? LocalKey = null,
    string? DpsPowerKey = null,
    string? ClientKey = null
);

public record StartDiscoveryRequest(int TimeoutSeconds = 30);

public record UpdateDeviceRequest(
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    IntegrationType IntegrationType,
    Guid? RoomId = null,
    string? IpAddress = null,
    string? MacAddress = null,
    string? LocalKey = null,
    string? DpsPowerKey = null,
    string? ClientKey = null
);
