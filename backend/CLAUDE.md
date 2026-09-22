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
