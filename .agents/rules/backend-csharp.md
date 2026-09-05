---
description: "Convenções e regras para código C# e .NET do backend do Smart Home Hub"
globs: ["backend/**/*.cs"]
alwaysApply: false
---

# Convenções C# / .NET (Smart Home Hub Backend)

- **Nomenclatura CQRS**: Command = `[Verbo][Substantivo]Command`, Query = `[Verbo][Substantivo]Query`, Handler = `[Nome]Handler` — Record, Validator e Handler ficam no MESMO arquivo, nunca separados.
- **Result Pattern**: falhas de negócio esperadas retornam `Result`/`Result<T>` (`Domain.Common.Primitives`). Exceptions só para bugs/infraestrutura, capturadas pelo `GlobalExceptionHandler`.
- **NRTs**: entidades EF Core usam `= null!` em propriedades de navegação (nunca `required` nelas); escalares imutáveis podem usar `required`. DTOs e Requests NUNCA usam `required` — quem barra ausência de dado é o FluentValidation.
- **Paginação**: toda listagem implementa `IPagedQuery` (`Page`, `PageSize`), retorna `PagedResult<T>`, e a query no EF Core tem `.OrderBy()` explícito antes de paginar. Exceção: queries de estatística agregada (ex: `GetEventHistoryStatsQuery`) não seguem `IPagedQuery`.
- **Logs**: Serilog com Message Templates (`"Processando {DeviceName}", name`) — nunca interpolação de string (`$"{Var}"`).
- **`DeleteBehavior.Cascade`/`.SetNull`/`.Restrict` NÃO são proibidos** — são usados extensivamente no schema físico (ver `backend/docs/database.md`). O que É esperado: desvinculação manual de FKs opcionais em memória no Handler antes do soft-delete (ex: `DeleteRoomCommandHandler` zera `device.RoomId` num loop), já que o soft-delete nunca aciona a constraint física.
- **Telemetria/auditoria** (`DeviceTelemetryLog`, `SystemEvent`): sempre Append-Only, nunca Soft Delete.