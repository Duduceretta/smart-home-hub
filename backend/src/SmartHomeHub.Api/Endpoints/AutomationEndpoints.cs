using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Automations.Commands.CreateAutomation;
using SmartHomeHub.Application.Features.Automations.Commands.DeleteAutomation;
using SmartHomeHub.Application.Features.Automations.Commands.UpdateAutomation;
using SmartHomeHub.Application.Features.Automations.Queries.GetAutomationById;
using SmartHomeHub.Application.Features.Automations.Queries.GetAutomations;

namespace SmartHomeHub.Api.Endpoints;

public static class AutomationEndpoints
{
    public static void MapAutomationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/automations",
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

                    var query = new GetAutomationsQuery(firebaseUid, page, pageSize);
                    var automations = await mediator.Send(query, cancellationToken);

                    return Results.Ok(automations);
                }
            )
            .RequireAuthorization()
            .WithTags("Automations")
            .WithSummary("Lista todas as automações")
            .WithDescription(
                "Retorna a lista paginada de automações cadastradas pelo usuário autenticado."
            )
            .Produces<object>(StatusCodes.Status200OK);

        app.MapGet(
                "/api/automations/{id:guid}",
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

                    var query = new GetAutomationByIdQuery(id, firebaseUid);
                    var automation = await mediator.Send(query, cancellationToken);

                    return automation is not null ? Results.Ok(automation) : Results.NotFound();
                }
            )
            .RequireAuthorization()
            .WithTags("Automations")
            .WithSummary("Busca uma automação por ID")
            .WithDescription(
                "Retorna os detalhes (incluindo o RulePayload ECA completo) de uma automação específica. Retorna 404 caso pertença a outro usuário ou não exista."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost(
                "/api/automations",
                async (
                    CreateAutomationRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new CreateAutomationCommand(
                        request.Name,
                        request.RulePayload,
                        request.IsActive,
                        firebaseUid
                    );
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Created(
                        $"/api/automations/{result.Value}",
                        new
                        {
                            message = "Automação criada com sucesso!",
                            automationId = result.Value,
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Automations")
            .WithSummary("Cria uma nova automação")
            .WithDescription(
                "Cria uma automação ECA (Event-Condition-Action) a partir do payload gerado pelo editor visual."
            )
            .Produces<object>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapPut(
                "/api/automations/{id:guid}",
                async (
                    Guid id,
                    UpdateAutomationRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var command = new UpdateAutomationCommand(
                        id,
                        request.Name,
                        request.RulePayload,
                        request.IsActive,
                        firebaseUid
                    );
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(
                        new
                        {
                            id,
                            name = request.Name,
                            isActive = request.IsActive,
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Automations")
            .WithSummary("Atualiza uma automação existente")
            .WithDescription(
                "Substitui nome, payload ECA e status de uma automação já criada. Reagenda ou remove o gatilho de tempo no Hangfire conforme o novo payload."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapDelete(
                "/api/automations/{id:guid}",
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

                    var command = new DeleteAutomationCommand(id, firebaseUid);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Automations")
            .WithSummary("Deleta uma automação (Soft Delete)")
            .WithDescription(
                "Realiza a exclusão lógica da automação e remove o Recurring Job associado no Hangfire, se houver."
            )
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}

public record CreateAutomationRequest(string Name, string RulePayload, bool IsActive);

public record UpdateAutomationRequest(string Name, string RulePayload, bool IsActive);
