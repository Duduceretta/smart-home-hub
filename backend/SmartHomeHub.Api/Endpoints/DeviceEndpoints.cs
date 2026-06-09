using System.Security.Claims;
using Mediator;
using SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;
using SmartHomeHub.Application.Features.Devices.Commands.DeleteDevice;
using SmartHomeHub.Application.Features.Devices.Commands.ToggleDevice;
using SmartHomeHub.Application.Features.Devices.Commands.UpdateDevice;
using SmartHomeHub.Application.Features.Devices.Queries.GetDevices;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Api.Endpoints;

public static class DeviceEndpoints
{
    public static void MapDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/devices", async (
            ClaimsPrincipal userToken,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var firebaseUid = userToken.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(firebaseUid)) return Results.Unauthorized();

            var query = new GetDevicesQuery(firebaseUid);
            var devices = await mediator.Send(query, cancellationToken);

            return Results.Ok(devices);
        })
        .RequireAuthorization();

        app.MapPost("/api/devices", async (
            CreateDeviceRequest request,
            ClaimsPrincipal userToken,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var firebaseUid = userToken.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(firebaseUid)) return Results.Unauthorized();

            var command = new CreateDeviceCommand(
                request.Name, 
                request.Brand, 
                request.ExternalId, 
                request.Type, 
                request.RoomId, 
                firebaseUid);

            var result = await mediator.Send(command, cancellationToken);

            if (result.IsFailure)
            {
                return Results.BadRequest(new { error = result.Error.Code, detail = result.Error.Description });
            }

            return Results.Created($"/api/devices/{result.Value}", new
            {
                message = "Dispositivo registado com sucesso!",
                deviceId = result.Value
            });
        })
        .RequireAuthorization();

        app.MapPost("/api/devices/{id:guid}/toggle", async (
            Guid id,
            ClaimsPrincipal userToken,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var firebaseUid = userToken.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(firebaseUid)) return Results.Unauthorized();

            var command = new ToggleDeviceCommand(id, firebaseUid);
            var result = await mediator.Send(command, cancellationToken);

            if (result.IsFailure)
            {
                if (result.Error.Code.Contains("NotFound"))
                    return Results.NotFound(new { error = result.Error.Code, detail = result.Error.Description });

                return Results.BadRequest(new { error = result.Error.Code, detail = result.Error.Description });
            }

            return Results.Ok(new { message = "Comando enviado com sucesso." });
        })
        .RequireAuthorization();

        app.MapPut("/api/devices/{id:guid}", async (
            Guid id,
            UpdateDeviceRequest request,
            ClaimsPrincipal userToken,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var firebaseUid = userToken.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(firebaseUid)) return Results.Unauthorized();

            var command = new UpdateDeviceCommand(
                id, 
                request.Name, 
                request.Brand, 
                request.ExternalId, 
                request.Type, 
                request.RoomId, 
                firebaseUid);

            var result = await mediator.Send(command, cancellationToken);

            if (result.IsFailure)
            {
                if (result.Error.Code.Contains("NotFound"))
                {
                    return Results.NotFound(new { error = result.Error.Code, detail = result.Error.Description });
                }

                return Results.BadRequest(new { error = result.Error.Code, detail = result.Error.Description });
            }

            return Results.Ok(new
            {
                id = id,
                name = request.Name,
                brand = request.Brand,
                externalId = request.ExternalId,
                type = request.Type,
                roomId = request.RoomId
            });
        })
        .RequireAuthorization();

        app.MapDelete("/api/devices/{id:guid}", async (
            Guid id,
            ClaimsPrincipal userToken,
            IMediator mediator,
            CancellationToken cancellationToken) =>
        {
            var firebaseUid = userToken.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(firebaseUid)) return Results.Unauthorized();

            var command = new DeleteDeviceCommand(id, firebaseUid);
            var result = await mediator.Send(command, cancellationToken);

            if (result.IsFailure)
            {
                return Results.NotFound(new { error = result.Error.Code, detail = result.Error.Description });
            }

            return Results.NoContent();
        })
        .RequireAuthorization();
    }
}

public record CreateDeviceRequest(
    string Name, 
    string Brand, 
    string ExternalId, 
    DeviceType Type, 
    Guid? RoomId);

public record UpdateDeviceRequest(string Name, string Brand, string ExternalId, DeviceType Type, Guid? RoomId);