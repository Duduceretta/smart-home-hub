---
name: dotnet-minimal-apis
description: Usar ao criar ou alterar endpoint HTTP no backend do Nexus Hub (MapGet/MapPost, route group, endpoint filter, contrato de resposta, status codes, OpenAPI). Endpoints são Minimal APIs finos que delegam ao Mediator — nunca Controllers MVC.
paths:
  - "backend/**/*.cs"
---

# Minimal APIs — Nexus Hub

## Antes de escrever
Abrir 1–2 módulos de endpoint existentes e replicar a organização (nome do arquivo, extension method, group, filtros). Consistência com o repo vence qualquer exemplo daqui.

## Estrutura (padrão real do repo — ver `RoomEndpoints.cs`, `AuthEndpoints.cs`)
- Extension method estático por feature, `void` de retorno, registrado em `Program.cs` (`app.Map{Feature}Endpoints()`). Nunca endpoint inline no `Program.cs`.
- `MapGroup` é opcional, não obrigatório: a maioria dos módulos (`RoomEndpoints`, `DeviceEndpoints`, `DashboardEndpoints` etc.) registra direto em `app.MapGet(...)`/`app.MapPost(...)` sem group, encadeando `.RequireAuthorization()`/`.WithTags(...)` por endpoint. Só `AuthEndpoints` usa `app.MapGroup("/api/auth").WithTags("Auth")` porque os dois endpoints (`forgot-password`, `send-verification-email`) são públicos (`.AllowAnonymous()`) e compartilham tudo. **Antes de escrever, abrir 1–2 módulos e replicar a organização do que já existe** — não introduzir `MapGroup` num módulo que não tinha, isso é reescrita de estilo fora de escopo.
- Retorno é `Results.Ok(...)`/`Results.Unauthorized()`/`Results.NotFound()` etc. (não `TypedResults`/`Results<...>` tipado) — o contrato de status é documentado via `.Produces<T>(StatusCodes...)`/`.ProducesProblem(...)` fluente, não pelo tipo de retorno do delegate:
  ```csharp
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
                      var firebaseUid = userToken.GetFirebaseUid();
                      if (string.IsNullOrEmpty(firebaseUid))
                          return Results.Unauthorized();

                      var query = new GetRoomsQuery(firebaseUid, page, pageSize);
                      var rooms = await mediator.Send(query, cancellationToken);
                      return Results.Ok(rooms);
                  }
              )
              .RequireAuthorization()
              .WithTags("Rooms")
              .Produces<PagedResult<RoomDto>>(StatusCodes.Status200OK)
              .ProducesProblem(StatusCodes.Status401Unauthorized);
      }
  }
  ```
- Uid do usuário vem de `ClaimsPrincipal userToken` + extensão `userToken.GetFirebaseUid()` (não de `Context.User` — isso é hub, não endpoint HTTP).
- Resultado de handler que retorna `Result`/`Result<T>` (falha de negócio esperada): endpoint chama `result.ToProblemDetails()` (`ResultExtensions`) explicitamente — ver skill `exception-handling` pro fluxo completo.

## Regras
- **Endpoint fino**: bind → `mediator.Send(...)` → mapear resultado (`Results.Ok`/`.ToProblemDetails()`). Regra de negócio mora no handler (Application), nunca no delegate.
- **`CancellationToken`** em todo delegate e propagado até o EF.
- Parâmetros complexos de query: `[AsParameters]` com record.
- Autorização por endpoint (`.RequireAuthorization()`) ou por group quando o módulo já usa group (caso `AuthEndpoints`); exceção explícita com `.AllowAnonymous()` só quando necessário.
- Validação: seguir o pipeline do Mediator (`ValidationBehavior`) — ver skill `validation-patterns`. Nunca validar inline no delegate.
- Erros: não montar `ProblemDetails` na mão no endpoint — `result.ToProblemDetails()` pra falha esperada, `GlobalExceptionHandler` pra exceção — ver skill `exception-handling`.
- JSON: `ConfigureHttpJsonOptions` (vale só para Minimal APIs).
- .NET 10 tem OpenAPI 3.1 nativo (`AddOpenApi`/`MapOpenApi`); API nova do .NET 10: confirmar no context7 antes de usar.

## Status codes são contrato
O frontend decide UX pelo status (ex.: distinguir falha de rede de erro de auth). Status errado = bug de UX.
- `200` leitura, `201` + location em criação, `204` sem corpo, `400` validação (ValidationProblem), `401` sem auth, `403` sem permissão, `404` inexistente, `409` conflito de estado, `422` regra de negócio violada, `502/503/504` dependência externa (dispositivo, Tuya, Spotify) indisponível.

## Mudança de contrato (expand-contract)
Backend e frontend fazem deploy separado:
- Endpoint novo ao lado do antigo; antigo marcado `[Obsolete]` no handler e `.WithOpenApi(op => { op.Deprecated = true; return op; })` (ou equivalente do repo).
- Campo novo em DTO: adicionar opcional; nunca renomear/remover campo no mesmo PR.
- Remoção do antigo só em PR `chore(...)` depois do frontend migrado e em produção.

## Teste
Endpoint novo/alterado: teste de integração via `WebApplicationFactory<Program>` cobrindo status codes do tipo de retorno — ver skill `testcontainers`.
