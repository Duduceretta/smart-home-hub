---
name: efcore-patterns
description: Usar ao escrever ou alterar query EF Core, DbContext, migration ou acesso a dados no backend do Nexus Hub — inclui lifetime de DbContext em workers/Hangfire, performance (N+1, tracking, projeção, limites), TimescaleDB (hypertables, compressão, queries por intervalo) e migrations expand-contract.
paths:
  - "backend/**/*.cs"
---

# EF Core e Acesso a Dados — Nexus Hub

Comandos `dotnet ef` (projeto, startup, contexto): ver `CLAUDE.md` do backend.

## 1. Lifetime do DbContext (regra crítica)
Bugs reais já vieram daqui (DbContext concorrente, captive dependency).
- `DbContext` é **Scoped**. Nunca injetar em Singleton, `BackgroundService`, `IHostedService` ou handler do Mediator configurado como Singleton.
- Worker/serviço de vida longa: `IServiceScopeFactory` (um escopo por unidade de trabalho) ou `IDbContextFactory<T>` (`await using var db = await factory.CreateDbContextAsync(ct)`). Seguir o que o repo já usa.
- **Mediator (source gen) registra handlers como Singleton por padrão.** Conferir o `ServiceLifetime` configurado no `AddMediator` antes de injetar DbContext em handler.
- Um DbContext nunca é usado por duas tasks ao mesmo tempo (`Task.WhenAll` sobre o mesmo contexto = bug). Paralelizar = um contexto por task.
- Pooling (`AddDbContextPool`): contexto não guarda estado por request nem recebe serviço Scoped no construtor.

## 2. Leitura
- `AsNoTracking()` em toda leitura (ou default NoTracking do contexto, se já configurado — conferir).
- **Projetar para DTO** com `Select`, não carregar entidade inteira para devolver 3 campos.
- **Limite sempre**: toda query de lista tem `Take` / paginação. Nada sem limite.
- **N+1**: nunca query dentro de loop. `Where(x => ids.Contains(x.Id))` ou `Include`/projeção.
- 2+ `Include` de coleção: `AsSplitQuery()` ou projeção explícita (evita explosão cartesiana).
- Join sempre no SQL, nunca em memória no C#.
- `CancellationToken` propagado em toda chamada async.

## 3. Escrita
- Update em lote: `ExecuteUpdateAsync` / `ExecuteDeleteAsync`, não carregar e iterar.
- Com NoTracking default: `AsTracking()` na query que vai mutar, ou `Update()` explícito — senão `SaveChanges` não faz nada (falha silenciosa).
- Várias escritas que precisam ser atômicas: transação explícita dentro de `CreateExecutionStrategy().ExecuteAsync(...)` (retry do Npgsql exige isso).
- Modelo: Device Shadow (`Device` + `DeviceLiveState`), não TPH. `DeleteBehavior` caso a caso; `Restrict` em dado histórico (telemetria, eventos, automações).
- Não criar repositório genérico (`IRepository<T>`). Query específica por caso de uso.

## 4. TimescaleDB
- EF não conhece hypertable: criar via SQL na migration (`migrationBuilder.Sql("SELECT create_hypertable(...)")`), junto com política de compressão.
- PK/unique de hypertable **precisa incluir a coluna de tempo**.
- FK **para** hypertable não é suportada; FK **da** hypertable para tabela normal, sim.
- Retenção: indefinida (dados vão para ML). Não adicionar retention policy. Compressão sim.
- Query em hypertable **sempre com filtro de intervalo de tempo** — sem isso, varre todos os chunks.
- Agregação por janela: `time_bucket` via SQL/`FromSql` ou continuous aggregate, não `GroupBy` em memória.

## 5. Migrations
- Sempre via CLI (`dotnet ef migrations add`). Editar migration gerada só para adicionar SQL customizado (Timescale, índices específicos, backfill).
- Revisar o SQL gerado (`dotnet ef migrations script`) antes de commitar.
- **Expand-contract** (backend e frontend fazem deploy separado):
  1. Expand: adicionar coluna/tabela nullable ou com default.
  2. Migrar código e dados (backfill em migration ou job).
  3. Contract: remover o antigo em PR separado, depois de estabilizado.
- Nunca renomear coluna em um passo (vira drop + add = perda de dado).

## 6. Validar contra banco real
Mudança que altera carga ou frequência de query (nova query no hot path, índice, polling):
- `EXPLAIN (ANALYZE, BUFFERS)` no TimescaleDB de dev via MCP Postgres, antes e depois.
- Registrar o resultado na issue `NH`.

## Teste
- Query/migration/constraint: integração com Testcontainers usando a mesma imagem TimescaleDB de produção (skill `testcontainers`). Nunca `UseInMemoryDatabase` (não tem SQL, constraint nem Timescale).
- Lifetime: teste de DI com `ValidateScopes`/`ValidateOnBuild` (skill `testcontainers`).
