using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.DeviceGroups.Commands.CreateDeviceGroup;
using SmartHomeHub.Application.Features.DeviceGroups.Commands.DeleteDeviceGroup;
using SmartHomeHub.Application.Features.DeviceGroups.Commands.UpdateDeviceGroup;
using SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroupById;
using SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroups;

namespace SmartHomeHub.Api.Endpoints;

public static class DeviceGroupEndpoints
{
    public static void MapDeviceGroupEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/device-groups",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    int page = 1,
                    int pageSize = 10
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetDeviceGroupsQuery(firebaseUid, page, pageSize);
                    var groups = await mediator.Send(query, cancellationToken);

                    return Results.Ok(groups);
                }
            )
            .RequireAuthorization()
            .WithTags("Device Groups")
            .WithSummary("Lista todos os grupos de dispositivos")
            .WithDescription(
                "Retorna todos os grupos criados pelo usuário logado, incluindo a lista interna de dispositivos vinculados a cada grupo."
            )
            .Produces<object>(StatusCodes.Status200OK);

        app.MapGet(
                "/api/device-groups/{id:guid}",
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

                    var query = new GetDeviceGroupByIdQuery(id, firebaseUid);
                    var group = await mediator.Send(query, cancellationToken);

                    return group is not null ? Results.Ok(group) : Results.NotFound();
                }
            )
            .RequireAuthorization()
            .WithTags("Device Groups")
            .WithSummary("Busca um grupo específico por ID")
            .WithDescription(
                "Retorna os detalhes de um grupo e seus dispositivos. Retorna **404 Not Found** caso o grupo não exista ou pertença a outro usuário."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost(
                "/api/device-groups",
                async (
                    CreateDeviceGroupRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new CreateDeviceGroupCommand(
                        request.Name,
                        request.Icon,
                        request.DeviceIds,
                        firebaseUid
                    );

                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Created(
                        $"/api/device-groups/{result.Value}",
                        new
                        {
                            message = "Grupo de dispositivos criado com sucesso!",
                            groupId = result.Value,
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Device Groups")
            .WithSummary("Cria um novo grupo de dispositivos")
            .WithDescription(
                "Cria um grupo e vincula os dispositivos fornecidos na lista de IDs. A API barrará a criação com **400 Bad Request** caso um ID informado pertença a outro usuário."
            )
            .Produces<object>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapPut(
                "/api/device-groups/{id:guid}",
                async (
                    Guid id,
                    UpdateDeviceGroupRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new UpdateDeviceGroupCommand(
                        id,
                        request.Name,
                        request.Icon,
                        request.DeviceIds,
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
                            icon = request.Icon,
                            deviceIds = request.DeviceIds,
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Device Groups")
            .WithSummary("Atualiza os dados e os vínculos de um grupo")
            .WithDescription(
                "Substitui os dados cadastrais do grupo e sincroniza os dispositivos vinculados. Para remover todos os dispositivos do grupo, envie uma lista `deviceIds` vazia."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapDelete(
                "/api/device-groups/{id:guid}",
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

                    var command = new DeleteDeviceGroupCommand(id, firebaseUid);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Device Groups")
            .WithSummary("Deleta um grupo de dispositivos (Soft Delete)")
            .WithDescription(
                "Apaga o grupo de forma lógica. **Atenção:** Os dispositivos físicos que pertenciam ao grupo não são deletados, apenas desvinculados."
            )
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}

public record CreateDeviceGroupRequest(string Name, string? Icon, List<Guid> DeviceIds);

public record UpdateDeviceGroupRequest(string Name, string? Icon, List<Guid> DeviceIds);
