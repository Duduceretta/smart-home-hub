# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

Backend do Nexus Hub (Smart Home Hub IoT): API .NET 10 (C# 14, nullable habilitado) em Clean Architecture + CQRS, servindo o frontend React via REST + SignalR. Persiste em PostgreSQL/TimescaleDB, fala MQTT com hardware genérico (Sonoff/Tasmota/ESPHome), TCP/UDP direto com Tuya local, ADB/GoogleCast com TVs, e integra Spotify, Firebase Auth (IdP) e Resend (e-mail transacional). Automações (regras ECA) rodam via Hangfire + `Channel<T>` interno.

Projetos (`SmartHomeHub.slnx`, **não** `.sln`):
- `src/SmartHomeHub.Domain`: entidades, enums, `Result`/`Error` — zero dependência externa.
- `src/SmartHomeHub.Application`: casos de uso CQRS por feature, pipeline do Mediator.
- `src/SmartHomeHub.Infrastructure`: `AppDbContext`, migrations, MQTT, drivers Tuya/rede, SignalR, Hangfire, integrações externas.
- `src/SmartHomeHub.Api`: host ASP.NET Core, Minimal APIs, Serilog, Scalar, workers.
- `tests/SmartHomeHub.UnitTests`: lógica pura isolada.
- `tests/SmartHomeHub.IntegrationTests`: fluxo real via `WebApplicationFactory<Program>` + banco Docker.

Irmão: `frontend/` (React 19, Vite, porta `5173` em dev, Vercel em produção — domínio `nexushub.page`). CORS lido de `Cors:AllowedOrigins`/`AllowedOriginsDevelopment` em config, nunca hardcoded (`Program.cs`).

## Comandos

```bash
# Infra local (raiz do repo, não backend/)
docker-compose up -d                    # PostgreSQL+TimescaleDB (timescale/timescaledb:latest-pg15) + Mosquitto + cloudflared

# Uma vez após clonar (csharpier é dotnet tool local, ver .config/dotnet-tools.json)
dotnet tool restore

dotnet build                            # a partir de backend/
dotnet run --project src/SmartHomeHub.Api
# HTTP  http://localhost:5252
# HTTPS https://localhost:7240 — abre Scalar (/scalar) automaticamente em Development

dotnet test                             # todos os projetos de teste
dotnet test tests/SmartHomeHub.UnitTests --filter "FullyQualifiedName~NomeDoTeste"   # 1 teste

dotnet ef migrations add NomeDaMigration --project src/SmartHomeHub.Infrastructure --startup-project src/SmartHomeHub.Api
dotnet ef migrations script --project src/SmartHomeHub.Infrastructure --startup-project src/SmartHomeHub.Api   # revisar SQL antes de commitar

dotnet csharpier .                      # formatação
```

Se `dotnet build`/`test` falhar com erro de lock de DLL (`MSB3027`/`MSB3026`), é porque `dotnet run`/`watch` da API já está rodando — encerrar o processo antes.

Migrations aplicam sozinhas no boot (`Program.cs`, `dbContext.Database.MigrateAsync()` dentro de um scope) — não precisa rodar `dotnet ef database update` manualmente em dev.

## Testes

Dois projetos, papéis diferentes — metodologia de quando/como escrever cada tipo fica na skill `legacy-code-workflow` e em `backend/docs/testing-strategy.md`; aqui só os fatos:

- **`tests/SmartHomeHub.UnitTests`**: xUnit v3 (`mtp-v2`), FluentAssertions, NSubstitute. `Microsoft.EntityFrameworkCore.InMemory` só aqui, nunca na integração. Cobre lógica pura (records `Result`/`Error`, validators isolados, drivers Tuya).
- **`tests/SmartHomeHub.IntegrationTests`**: `Testcontainers.PostgreSql` sobe **um** container `timescale/timescaledb:latest-pg15` por coleção (`[Collection("ExtensionsCollection")]`), reaproveitando a mesma `WebApplicationFactory<Program>` — **Respawn** reseta as tabelas do schema `public` entre cada `[Fact]` (nunca `UseInMemoryDatabase` aqui, não tem SQL/Timescale/constraint reais). Também referencia `Microsoft.AspNetCore.SignalR.Client` para testar `TelemetryHub` de ponta a ponta.

## Pipeline / Deploy

**Sem CI configurado** — não existe `.github/` no repo. Build/test/format rodam manualmente ou via hook local; não presumir gate automático de PR.

Deploy: host único (mini PC), API exposta via **Cloudflare Tunnel** (`cloudflared`, serviço no `docker-compose.yml` da raiz) — sem backplane Redis para SignalR porque é instância única. Config via `DotNetEnv` (`.env`, `Env.TraversePath().Load()` no boot) + `appsettings.json`/`appsettings.Development.json` (Firebase `ProjectId`/`CredentialPath`, Spotify OAuth, Resend, `Frontend:BaseUrl`).

## Arquitetura

**Boot (`Program.cs`)**: Serilog configurado antes do host — `.env` carregado — Kestrel limitado a 2MB de body — CORS por policy nomeada (`AllowFrontend`, origem por chave de ambiente inteira, nunca merge posicional de array) — 2 rate limiters nomeados (`AuthRateLimit` 10/min/IP, `DeviceMutationRateLimit` 30/min/IP) — `AddInfrastructure`+`AddApplication` — hosted services — `GlobalExceptionHandler` — OpenAPI nativo (.NET 10) com Bearer scheme — migração automática no boot — ordem de middleware: `UseCors` → (Dev: `MapOpenApi`+Scalar) → `UseExceptionHandler` → `UseAuthentication` → `UseAuthorization` → `UseRateLimiter` → `UseHangfireDashboard("/hangfire")` → endpoints.

**Hosted services registrados** (`Program.cs`): `MqttListenerWorker`, `DeviceHealthCheckWorker`, `DeviceStatePollingWorker`, `TuyaDeviceStatePollingWorker` sempre; `MockTelemetryWorker` só em Development. `AutomationExecutionWorker` é registrado em `Infrastructure/DependencyInjection.cs`. Automações agendadas (cron/tempo) passam por Hangfire (`UsePostgreSqlStorage`, `WorkerCount = min(CPU, 10)` — deliberadamente limitado pra não competir com o `Channel<T>` interno).

**Lifetimes de DI que importam** (`Infrastructure/DependencyInjection.cs`, comentados no próprio código):
- Mediator: `ServiceLifetime.Scoped` explícito (`Application/DependencyInjection.cs`) — **não** é o Singleton default da lib.
- `ITuyaLocalControlService`: **Singleton** deliberado — guarda semáforo por dispositivo e lote de coalescência em campo de instância; como `Transient`, cada requisição HTTP teria seu próprio estado isolado e o semáforo/coalescência não teriam efeito real (bug já corrigido em produção, ver `backend/docs/iot-drivers.md` §2.3).
- `IRealtimeNotificationService`: Scoped, encapsula `IHubContext<TelemetryHub>` — Handlers/Workers chamam essa interface, nunca `IHubContext` cru.
- `IMqttService`: Singleton (conexão persistente com sessão MQTT de 5min, `ClientId` fixo).

**Erros (híbrido Result/Exception)**: falha esperada de negócio → handler devolve `Result.Failure(new Error(code, description))`; endpoint chama `result.ToProblemDetails()` (`Api/Extensions/ResultExtensions.cs`), que roteia o status por **substring do `Error.Code`** (`NotFound`→404, `Conflict`→409, `Forbidden`/`Unauthorized`→403, `Validation`→422, resto→400 default). Falha inesperada → exceção → `GlobalExceptionHandler` (`Api/Middlewares/`), que **sempre devolve 500 genérico** (não faz switch por tipo). Detalhe completo, incluindo a pegadinha de `ValidationBehavior` cair no branch default 400: skills `exception-handling`/`validation-patterns`.

**Auth**: Firebase JWT Bearer; para `/hubs/*` (WebSocket não manda header `Authorization`) o token vem via query string `access_token`, extraído em `OnMessageReceived` (`Infrastructure/DependencyInjection.cs`). Fluxo completo de identidade híbrida (Firebase + `User.ExternalAuthUid`), anti-enumeração e rate limit: `backend/docs/architecture.md` §7.

**Realtime**: hub único `TelemetryHub` (`Infrastructure/Realtime/Hubs/`, rota `/hubs/telemetry`), untyped `Hub`, grupo `user_{firebaseUid}`. Catálogo de eventos, preview de sliders (brilho/cor) e reconciliação pós-reconexão: `backend/docs/architecture.md` §2.6 e §5, skill `signalr-integration`.

**Modelagem de Device**: Device Shadow (`Device` metadados + `DeviceLiveState` 1:1 estado volátil/JSONB) e `Configuration` tipada por protocolo (3 Value Objects: Tuya/MQTT/Network, resolvidos via conversor+interceptor a partir de `IntegrationType`) — decisão detalhada com todo o racional em `backend/docs/architecture.md` §1.4–1.5. Não reintroduzir herança EF (TPH/TPT) nem EAV aqui.

**TimescaleDB**: hypertables + continuous aggregates + política de compressão (7 dias, sem retenção — dataset preservado pra ML) — detalhes e SQL em `backend/docs/database.md`. Skill `efcore-patterns` cobre o padrão de acesso.

**Integrações IoT**: tópicos MQTT `home/telemetry/{externalId}` (entrada) / `home/commands/{externalId}` (saída, só hardware MQTT nativo) — `{externalId}` sempre `Device.ExternalId`. Tuya local fala TCP/UDP direto (AES-GCM v3.4/v3.5, coalescência de 75ms, circuit breaker de resolução de IP). Detalhes completos (sessão persistente, LWT, reconciliação de estado desejado na queda do broker): `backend/docs/iot-drivers.md`.

## Armadilhas

- **Solution é `SmartHomeHub.slnx`**, não `.sln` — ferramenta/script que procura `*.sln` não encontra nada.
- **Sem `.github/`** — não presumir CI/gate automático existente.
- `dotnet build`/`test` falha com `MSB3027` (lock de DLL) se `dotnet run`/`watch` da API já estiver rodando — matar o processo primeiro.
- Falha de `ValidationBehavior` (Result path) cai no branch **default 400** de `ToProblemDetails()`, não em `422` — o `Error.Code` vira o nome da propriedade (`"Brightness"`), não bate a palavra-chave `"Validation"`. Ver skill `validation-patterns`.
- `Configuration` (Device) não é mais um Owned Type via `.ToJson()` — EF **não traduz** `device.Configuration.Campo` dentro de um `.Where()`; filtro por esse campo precisa ser em memória após `ToListAsync()` (ver `DeviceHealthCheckWorker`). Só o que depende exclusivamente de `IntegrationType` (não de `Configuration`) pode voltar pro SQL.
- Eventos de dispositivo Tuya via SignalR vêm de **polling a cada 12s** (`TuyaDeviceStatePollingWorker`), não de push nativo do hardware — confirmado por bancada, interruptor físico não gera push espontâneo (`backend/docs/iot-drivers.md` §2.5). Não presumir latência de push real para Tuya.
- `compress_segmentby`/`compress_orderby` do TimescaleDB é string SQL interpretada separadamente — identificador sem aspas duplas *dentro* da string vira lowercase e quebra contra coluna PascalCase real (`backend/docs/database.md` §1).

## Clean Code

Convenções gerais (nomenclatura CQRS, NRTs, paginação, Result Pattern, DeleteBehavior) já estão em `.claude/rules/backend-csharp.md` (auto-anexada em qualquer `backend/**/*.cs`) — regras específicas por camada moram nas skills listadas abaixo, não aqui.

Reutilizar módulo como referência ao criar algo novo: `RoomEndpoints.cs`/`AuthEndpoints.cs` (estilo de endpoint real do repo — sem `MapGroup`/`TypedResults`, salvo exceção documentada em `AuthEndpoints`), `GetEventHistoryQuery.cs` (record+validator+handler no mesmo arquivo, e único uso legítimo de `Database.SqlQuery<T>` pra Continuous Aggregate).

## Skills deste repo

| Situação | Skill |
|---|---|
| Alterar código existente ou nova feature/fix | `legacy-code-workflow` |
| Endpoint HTTP | `dotnet-minimal-apis` |
| Validação (FluentValidation, pipeline do Mediator) | `validation-patterns` |
| Erro/exceção/ProblemDetails | `exception-handling` |
| SignalR (hub ou broadcast) | `signalr-integration` |
| EF Core / TimescaleDB | `efcore-patterns` |
| Teste de integração (Testcontainers) | `testcontainers` |
