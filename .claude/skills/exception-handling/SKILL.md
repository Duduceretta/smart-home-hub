---
name: exception-handling
description: Usar ao lançar, capturar ou mapear erros no backend do Nexus Hub — exceções de domínio, IExceptionHandler global, ProblemDetails em Minimal APIs, falha de dispositivo/integração externa, e loop de BackgroundService/worker que não pode morrer.
paths:
  - "backend/**/*.cs"
---

# Tratamento de Erro — Nexus Hub

## Antes de escrever
Falha esperada nova: olhar `ResultExtensions.ToProblemDetails()` e escolher/reaproveitar convenção de `Error.Code` — não criar exceção de domínio pra isso. Falha inesperada: já cai no `GlobalExceptionHandler` existente, nada a registrar.

## Dois caminhos — não misturar (Tratamento Híbrido, ver `backend/CLAUDE.md`)
| Tipo de falha | Mecanismo | Onde o status é decidido |
|---|---|---|
| **Esperada** (não encontrado, conflito, regra de negócio violada) | `Result`/`Result<T>` (Result Pattern) retornado pelo handler | Endpoint chama `result.ToProblemDetails()` explicitamente |
| **Inesperada** (bug, infra caindo, exceção não tratada) | `throw` normal, capturada pelo `GlobalExceptionHandler` | Sempre `500` genérico — não há switch por tipo de exceção |

Handler não devolve `Result.Failure` **e** deixa algo lançar exceção pro mesmo erro — é um ou outro.

## Caminho 1: Result Pattern → `ResultExtensions.ToProblemDetails()`
Handler retorna `Result.Failure(new Error(code, description))`. O endpoint (não um filtro/middleware central) chama a extensão explicitamente:
```csharp
var result = await mediator.Send(command, cancellationToken);
if (result.IsFailure)
    return result.ToProblemDetails();
return Results.Ok(...);
```
`ToProblemDetails()` (`SmartHomeHub.Api/Extensions/ResultExtensions.cs`) mapeia por **substring do `Error.Code`**, não por tipo:
- `Code` contém `"NotFound"` → `404`
- `Code` contém `"Conflict"` → `409`
- `Code` contém `"Forbidden"`/`"Unauthorized"` → `403`
- `Code` contém `"Validation"` → `422`
- qualquer outro → `400` (default)

Ao criar um `Error` novo para um handler, escolher o `Code` **com a palavra-chave certa** (ex.: `"Room.NotFound"`, não `"Room.Missing"`) — é assim que o status HTTP é decidido, não existe mapeamento por tipo C#.

## Caminho 2: `GlobalExceptionHandler` — fallback genérico, não roteador de status
`GlobalExceptionHandler.cs` (`SmartHomeHub.Api/Middlewares/`) implementa `IExceptionHandler` e **sempre devolve 500** — loga a exceção com `TraceIdentifier` e escreve um `ProblemDetails` genérico ("Erro Interno do Servidor"). Ele **não faz switch por tipo de exceção** para decidir 404/409/422: isso é papel do Caminho 1. Não criar exceções de domínio tipadas (`NotFoundException`, `ConflictException` etc.) esperando que o handler global as traduza — não existe esse mecanismo no repo. Se uma falha esperada precisa de status específico, ela é modelada como `Result.Failure`, não como exceção.
- 500 nunca expõe stack/mensagem interna ao cliente — a resposta é sempre a mensagem genérica.
- `TraceIdentifier` vai em `ProblemDetails.Instance`, correlaciona com o log (`Falha Crítica [{TraceId}]`).

## `ValidationException` do FluentValidation — só quando a resposta não é `Result`
`ValidationBehavior` (pipeline do Mediator) devolve `Result.Failure` quando `TResponse` é `Result`/`Result<T>` (caso comum, cai no Caminho 1 acima, vira `422`/`400` via `ToProblemDetails()`). Só lança `ValidationException` quando o handler **não** usa Result Pattern como retorno — nesse caso cai no Caminho 2 (`GlobalExceptionHandler`) e vira `500` genérico, **não** `400` — não presumir tradução automática pra `ValidationProblemDetails`.

## Status é contrato com o frontend
O frontend separa falha de rede, erro de auth e dependência fora do ar (banner sistêmico, `CardErrorFallback`, stale data). Já houve bug de card classificando falha de rede como erro de OAuth. Então:
- Integração externa (Tuya, Spotify, ADB, MQTT) fora do ar → `Error.Code` com palavra-chave que caia em `503`/`504` se existir esse mapeamento, ou adicionar o caso em `ToProblemDetails()` — **nunca** `401` nem deixar cair no `500` genérico do Caminho 2 se a falha era esperada.
- Token do provedor externo expirado/revogado → erro distinto (`Error.Code` próprio), não `"Unauthorized"` (que o front interpreta como sessão do usuário caindo em `403`).

## Workers e loops de longa duração
```csharp
while (!stoppingToken.IsCancellationRequested)
{
    try { await ProcessOnceAsync(stoppingToken); }
    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
    catch (Exception ex)
    {
        logger.LogError(ex, "Telemetry ingest iteration failed");
        await Task.Delay(backoff, stoppingToken);
    }
}
```
- Exceção não tratada em `BackgroundService` derruba o host (.NET 8+ default). Toda iteração protegida.
- Falha de **um** dispositivo nunca para o processamento dos outros: isolar try/catch por item.
- Hangfire: deixar a exceção subir para o retry nativo só se o job for idempotente (chave determinística); senão, capturar e registrar estado.

## Anti-padrões
- `catch (Exception) { }` silencioso.
- `throw new Exception("...")` ou exceção de domínio tipada para regra de negócio esperada — isso é `Result.Failure`, não exceção.
- `throw ex;` (perde stack) — usar `throw;`.
- `try/catch` em endpoint para montar resposta — endpoint só chama `.ToProblemDetails()` no `Result`, nunca captura exceção.

## Teste
- Caminho 1 (Result → status específico): teste de integração via `WebApplicationFactory` provocando a falha esperada (ex.: recurso inexistente) e checando o status mapeado por `ToProblemDetails()`.
- Caminho 2 (exceção → 500 genérico): teste de integração provocando uma falha inesperada (ex.: dependência quebrada via fake) e checando `500` + `ProblemDetails` genérico, nunca um status específico.
