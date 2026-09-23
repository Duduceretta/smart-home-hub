## ⚙️ Backend — Arquitetura Limpa & CQRS (C# / .NET 10)

### Comandos
- **Compilar**: `dotnet build`
- **Executar API**: `dotnet run --project src/SmartHomeHub.Api`
- **Rodar Testes**: `dotnet test`
- **Formatação de Código**: `dotnet csharpier .`

### 1. Estrutura de Camadas
- `SmartHomeHub.Domain`: Entidades puras, Enums, primitivos `Result` e `Error` (zero dependências externas).
- `SmartHomeHub.Application`: Casos de uso divididos por features em CQRS.
- `SmartHomeHub.Infrastructure`: EF Core (`AppDbContext`), configurações de entidades, migrações, MQTT e serviços de rede.
- `SmartHomeHub.Api`: Host ASP.NET Core, Minimal APIs, Serilog, Scalar OpenAPI e Workers.
- `SmartHomeHub.IntegrationTests`: Testes E2E com **Testcontainers** (um container Docker por coleção de testes + **Respawn** resetando as tabelas entre cada `[Fact]`) no padrão AAA.

### 2. Padrões de Código e CQRS

> Convenções de nomenclatura, Result Pattern, NRTs, paginação e logs: ver `.claude/rules/backend-csharp.md` (carrega junto ao editar `.cs`).

- **Biblioteca Mediator**: Utiliza o pacote `Mediator` com Source Generators em tempo de compilação (não usar o MediatR clássico baseado em Reflection).
- **MQTT**: telemetria de entrada em `home/telemetry/{externalId}`; comandos de saída em `home/commands/{externalId}` — `{externalId}` é sempre o `Device.ExternalId`, nunca o `deviceId` interno, nos dois tópicos — só aplicável a hardware MQTT genérico (Sonoff/Tasmota). Dispositivos Tuya usam TCP/UDP direto (AES-GCM), não passam por esse tópico.

### 3. Soft Delete

Entidades principais (`User`, `Room`, `Device`, `DeviceGroup`) implementam `ISoftDeletable` (`IsDeleted`, `DeletedAt`). A aplicação nunca dispara `DELETE` físico — o `AppDbContext` intercepta e converte em atualização lógica.

- O schema físico do EF Core **usa `DeleteBehavior.Cascade`/`.SetNull`/`.Restrict` extensivamente** nas relações — isso **não é proibido** e não deve ser removido ou "corrigido". Funciona como segunda camada de proteção para qualquer caminho que acesse o banco fora do `AppDbContext` interceptado (migrations, scripts administrativos).
- O que É esperado, e deve continuar sendo feito manualmente no Handler antes do soft-delete disparar, é a **desvinculação de FKs opcionais em memória** quando o pai é removido logicamente (ex: `DeleteRoomCommandHandler` zera `device.RoomId` num loop antes de remover o `Room`) — já que o soft-delete nunca aciona a constraint física do banco.
- Índices parciais de unicidade (ex: `ExternalId`) devem conter `.HasFilter("\"IsDeleted\" = false")`.

### 4. Skills — quando usar

Description do frontmatter já dispara sozinho na maioria dos casos, mas usar o gatilho explícito garante:

| Situação | Skill |
|---|---|
| Criar/editar Command/Query handler, DTO, ou qualquer `.cs` com record/pattern matching | `dotnet-csharp-modern-patterns` |
| Criar/editar endpoint Minimal API (`MapGet`/`MapPost`/route group) | `dotnet-minimal-apis` |
| Criar/editar query EF Core, migration, ou configurar `DbContext` | `efcore-patterns` |
| Criar/editar `AbstractValidator`/regra de validação | `validation-patterns` |
| Criar/editar Hub SignalR ou broadcast em tempo real | `signalr-integration` |
| Escrever teste de integração (banco/container real) | `testcontainers` |

Se a tarefa não disparar a skill sozinha, invoca explícito: `use a skill {nome} pra {tarefa}`.