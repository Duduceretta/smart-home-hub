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
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetDeviceGroupsQuery(firebaseUid);
                    var groups = await mediator.Send(query, cancellationToken);

                    return Results.Ok(groups);
                }
            )
            .RequireAuthorization();

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
            .RequireAuthorization();

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
            .RequireAuthorization();

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
            .RequireAuthorization();

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
            .RequireAuthorization();
    }
}

public record CreateDeviceGroupRequest(string Name, string? Icon, List<Guid> DeviceIds);

public record UpdateDeviceGroupRequest(string Name, string? Icon, List<Guid> DeviceIds);
