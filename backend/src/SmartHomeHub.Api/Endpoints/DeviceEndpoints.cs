using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;
using SmartHomeHub.Application.Features.Devices.Commands.DeleteDevice;
using SmartHomeHub.Application.Features.Devices.Commands.ToggleDevice;
using SmartHomeHub.Application.Features.Devices.Commands.UpdateDevice;
using SmartHomeHub.Application.Features.Devices.Queries.GetDeviceById;
using SmartHomeHub.Application.Features.Devices.Queries.GetDevices;
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
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetDevicesQuery(firebaseUid);
                    var devices = await mediator.Send(query, cancellationToken);

                    return Results.Ok(devices);
                }
            )
            .RequireAuthorization()
            .WithTags("Devices")
            .WithSummary("Lista todos os dispositivos")
            .WithDescription(
                "Retorna uma lista contendo todos os dispositivos ativos associados ao usuário autenticado."
            )
            .Produces<object>(StatusCodes.Status200OK);

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
                        request.RoomId,
                        firebaseUid
                    );

                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Created(
                        $"/api/devices/{result.Value}",
                        new
                        {
                            message = "Dispositivo registado com sucesso!",
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
                "Inverte o estado atual (`IsOn`) do dispositivo no banco de dados e dispara automaticamente um comando via **MQTT** para atualizar o hardware físico."
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
                        request.RoomId,
                        firebaseUid
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
    }
}

public record CreateDeviceRequest(
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    Guid? RoomId
);

public record UpdateDeviceRequest(
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    Guid? RoomId
);
