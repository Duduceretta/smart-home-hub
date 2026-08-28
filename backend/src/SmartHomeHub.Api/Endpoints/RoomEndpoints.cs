using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Rooms.Commands.CreateRoom;
using SmartHomeHub.Application.Features.Rooms.Commands.DeleteRoom;
using SmartHomeHub.Application.Features.Rooms.Commands.UpdateRoom;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRoomAutomations;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRoomById;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRoomClimate;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRoomEnergy;
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
                    CancellationToken cancellationToken,
                    int page = 1,
                    int pageSize = 10
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetRoomsQuery(firebaseUid, page, pageSize);
                    var rooms = await mediator.Send(query, cancellationToken);

                    return Results.Ok(rooms);
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Lista todos os ambientes")
            .WithDescription(
                "Retorna a lista de todos os ambientes cadastrados pelo usuário autenticado."
            )
            .Produces<object>(StatusCodes.Status200OK);

        app.MapGet(
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

                    var query = new GetRoomByIdQuery(id, firebaseUid);
                    var room = await mediator.Send(query, cancellationToken);

                    return room is not null ? Results.Ok(room) : Results.NotFound();
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Busca um ambiente por ID")
            .WithDescription(
                "Retorna os detalhes de um ambiente específico. Retorna erro 404 caso o ambiente pertença a outro usuário ou não exista."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

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
                        return result.ToProblemDetails();

                    return Results.Created(
                        $"/api/rooms/{result.Value}",
                        new { message = "Ambiente criado com sucesso!", roomId = result.Value }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Cria um novo ambiente")
            .WithDescription(
                "Criação de um novo ambiente físico (ex: 'Sala de Estar', 'Cozinha') para alocação futura de dispositivos."
            )
            .Produces<object>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

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
                        return result.ToProblemDetails();

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
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Atualiza um ambiente existente")
            .WithDescription("Permite a alteração do nome e ícone de um ambiente já criado.")
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

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
                        return result.ToProblemDetails();

                    return Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Deleta um ambiente (Soft Delete)")
            .WithDescription(
                "Realiza a exclusão lógica do ambiente. Dispositivos atrelados a ele terão a propriedade RoomId definida como nula automaticamente (se configurado)."
            )
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapGet(
                "/api/rooms/{id:guid}/climate",
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

                    var query = new GetRoomClimateQuery(id, firebaseUid);
                    var result = await mediator.Send(query, cancellationToken);

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Última leitura de temperatura e umidade do ambiente")
            .WithDescription(
                "Retorna a leitura de temperatura/umidade mais recente entre os sensores/termostatos deste "
                    + "ambiente (mesma linha de telemetria para as duas grandezas). hasClimateSensor=false "
                    + "quando o ambiente não tem nenhum dispositivo desse tipo — o front-end deve omitir a "
                    + "seção de clima nesse caso, sem espaço reservado."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapGet(
                "/api/rooms/{id:guid}/energy",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    string? range
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetRoomEnergyQuery(id, firebaseUid, range);
                    var result = await mediator.Send(query, cancellationToken);

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Consumo de energia do ambiente")
            .WithDescription(
                "Gráfico de potência média (kW) por balde de 5min, somando só os dispositivos deste ambiente. "
                    + "range aceita '24h' (padrão) ou '7d'. hasEnergyData=false quando nenhum dispositivo do "
                    + "ambiente reportou consumo no período — o front-end deve omitir a seção de gráfico."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapGet(
                "/api/rooms/{id:guid}/automations",
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

                    var query = new GetRoomAutomationsQuery(id, firebaseUid);
                    var result = await mediator.Send(query, cancellationToken);

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("Rooms")
            .WithSummary("Automações vinculadas ao ambiente")
            .WithDescription(
                "Retorna as automações do usuário cujo gatilho, condição ou ação referenciam algum "
                    + "dispositivo deste ambiente (cruzamento feito no RulePayload de cada automação)."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}

public record UpdateRoomRequest(string Name, string Icon);

public record CreateRoomRequest(string Name, string Icon);
