using System.Security.Claims;
using Mediator;
using SmartHomeHub.Application.Features.Rooms.Commands.CreateRoom;
using SmartHomeHub.Application.Features.Rooms.Commands.DeleteRoom;
using SmartHomeHub.Application.Features.Rooms.Commands.UpdateRoom;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRooms;

namespace SmartHomeHub.Api.Endpoints;

public static class RoomEndpoints
{
    public static void MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/rooms",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetRoomsQuery(firebaseUid);
                    var rooms = await mediator.Send(query, cancellationToken);

                    return Results.Ok(rooms);
                }
            )
            .RequireAuthorization();

        app.MapPost(
                "/api/rooms",
                async (
                    CreateRoomRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new CreateRoomCommand(request.Name, request.Icon, firebaseUid);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                    {
                        return Results.BadRequest(
                            new { error = result.Error.Code, detail = result.Error.Description }
                        );
                    }

                    return Results.Created(
                        $"/api/rooms/{result.Value}",
                        new { message = "Ambiente criado com sucesso!", roomId = result.Value }
                    );
                }
            )
            .RequireAuthorization();

        app.MapPut(
                "/api/rooms/{id:guid}",
                async (
                    Guid id,
                    UpdateRoomRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new UpdateRoomCommand(
                        id,
                        request.Name,
                        request.Icon,
                        firebaseUid
                    );
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                    {
                        if (result.Error.Code.Contains("NotFound"))
                        {
                            return Results.NotFound(
                                new { error = result.Error.Code, detail = result.Error.Description }
                            );
                        }

                        return Results.BadRequest(
                            new { error = result.Error.Code, detail = result.Error.Description }
                        );
                    }

                    return Results.Ok(
                        new
                        {
                            id = id,
                            name = request.Name,
                            icon = request.Icon,
                        }
                    );
                }
            )
            .RequireAuthorization();

        app.MapDelete(
                "/api/rooms/{id:guid}",
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

                    var command = new DeleteRoomCommand(id, firebaseUid);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                    {
                        return Results.NotFound(
                            new { error = result.Error.Code, detail = result.Error.Description }
                        );
                    }

                    return Results.NoContent();
                }
            )
            .RequireAuthorization();
    }
}

public record UpdateRoomRequest(string Name, string Icon);

public record CreateRoomRequest(string Name, string Icon);
