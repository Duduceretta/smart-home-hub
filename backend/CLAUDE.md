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
- **Biblioteca Mediator**: Utiliza o pacote `Mediator` com Source Generators em tempo de compilação (não usar o MediatR clássico baseado em Reflection).
- **Nomenclatura**:
  - Command: `[Verbo][Substantivo]Command` (ex: `SetDeviceStateCommand`)
  - Query: `[Verbo][Substantivo]Query` (ex: `GetEventHistoryQuery`)
  - Handler: `[NomeDoCommandOuQuery]Handler` — **no mesmo arquivo** do Command/Query e do Validator, não em arquivos separados.
- **Tratamento de Erros Híbrido**:
  - Falhas de negócio esperadas: `Result` / `Result<T>` via Result Pattern.
  - Falhas inesperadas/infraestrutura: Exceptions capturadas pelo `GlobalExceptionHandler`.
  - Ambos retornam `ProblemDetails` (RFC 7807) padronizado para o frontend (`400`, `403`, `404`, `409`, `422`, `500`).
- **Validação de Entrada (Strict In, Tolerant Out)**:
  - FluentValidation no pipeline behavior intercepta requests antes dos Handlers.
  - DTOs e Requests **não** utilizam `required` para permitir que o FluentValidation controle o erro `422/400` padronizado.
  - Entidades: propriedades de navegação usam `= null!`; escalares imutáveis podem usar `required`.
- **Paginação Obrigatória**:
  - Proibido retorno de listas infinitas. Toda listagem implementa `IPagedQuery` (`Page`, `PageSize`) e retorna `PagedResult<T>` ordenado obrigatoriamente com `.OrderBy()` no EF Core.
  - Exceção deliberada: queries de estatística agregada (ex: `GetEventHistoryStatsQuery`) somam/contam sobre todo o conjunto filtrado de propósito e não seguem `IPagedQuery`.
- **Logs Estruturados (Serilog)**:
  - Estritamente **proibida** interpolação de strings (`$"{Var}"`) nos logs. Sempre usar Message Templates (`"Processando {DeviceName}", name`).
- **Telemetria IoT**: `DeviceTelemetryLog` e `SystemEvent` seguem padrão *Append-Only* no TimescaleDB (não usam Soft Delete).
- **MQTT**: telemetria de entrada em `home/telemetry/{deviceId}`; comandos de saída em `casa/comandos/{device.ExternalId}` — **note a inconsistência de idioma real no código** (inglês vs. português) — só aplicável a hardware MQTT genérico (Sonoff/Tasmota). Dispositivos Tuya usam TCP/UDP direto (AES-GCM), não passam por esse tópico.
