---
name: testcontainers
description: Usar ao escrever teste de integração no backend do Nexus Hub — com banco real (TimescaleDB), broker MQTT real, app subindo via WebApplicationFactory, ou teste de DI/lifetimes (Singleton/Scoped/Transient, captive dependency). Reutiliza a infra de integração existente do repo.
paths:
  - "backend/**/*.cs"
---

# Testes de Integração — Nexus Hub

## Regra zero: reutilizar a infra existente
O projeto de integração do Hub já tem fixture de containers + `WebApplicationFactory` (foi a referência copiada para outros projetos e pegou bugs reais de lifetime). **Antes de escrever teste, abrir essa infra e usar as fixtures/factory/helpers existentes.** Não criar factory, fixture ou container novo se já existe um equivalente.

## Quando usar cada nível
| Mudança | Teste |
|---|---|
| Lógica pura | Unit, sem Docker — não usar esta skill |
| Query, migration, constraint, hypertable | Testcontainers TimescaleDB |
| Endpoint, pipeline Mediator, middleware, auth, exception handler | `WebApplicationFactory<Program>` + containers |
| Registro de DI / lifetime | Teste de container de DI (seção 4) |
| Ingest MQTT → processamento | `WebApplicationFactory` + container Mosquitto |

## 1. Containers
- **Mesma imagem do banco de produção** (`timescale/timescaledb` com a tag do docker compose do deploy). Postgres puro não tem hypertable — teste passaria com schema diferente do real.
- Container compartilhado por coleção de testes (fixture), não um por teste. Isolamento via reset de dados entre testes (truncate/Respawn — seguir o que o repo usa).
- Schema via **as migrations reais** (`Database.MigrateAsync()`), nunca `EnsureCreated()` (pula SQL custom de Timescale).
- Portas sempre aleatórias (`GetConnectionString()` / `GetMappedPublicPort`), nunca fixas.
- Mosquitto (`eclipse-mosquitto`) só nos testes que exercitam MQTT de verdade.

## 2. WebApplicationFactory — composition root real
**O teste passa pelo `Program.cs` real.** Nunca montar à mão os serviços que em produção vêm do container de DI — foi exatamente assim que bugs de lifetime escaparam em outro projeto.

Pode substituir, via `ConfigureTestServices`, apenas **fronteiras externas**:
- Connection string → container.
- Autenticação Firebase → test auth handler (scheme de teste com claims controladas).
- Dispositivos físicos / rede local (UDP Tuya, ADB, Wake-on-LAN, Spotify HTTP) → fake da interface de borda.
- Hangfire: storage de teste ou servidor desligado, conforme o repo já faz.

Não pode substituir: handlers, behaviors, repositórios/DbContext, serviços de domínio, hubs, lifetimes. Se o teste precisa trocar isso para passar, o teste está simplificando o mecanismo real — parar e reportar.

## 3. Hosted services em teste
- Worker que toca hardware/rede local: desligar ou apontar para fake de borda.
- Worker que é o **objeto do teste** (ingest, engine de automação): manter ligado e dirigir por entrada real (publicar no Mosquitto, inserir no banco) e esperar efeito com polling com timeout — nunca `Task.Delay` fixo.

## 4. Testes de DI e lifetime
Obrigatório rodar ao mudar qualquer registro de DI.
```csharp
builder.UseDefaultServiceProvider(o =>
{
    o.ValidateScopes = true;   // Scoped resolvido do root → falha
    o.ValidateOnBuild = true;  // dependência faltando → falha no build
});
```
Cobrir:
- Resolver **todo** `IHostedService` e Singleton registrado — falha em captive dependency (Singleton → Scoped).
- Handlers do Mediator no lifetime configurado conseguem resolver suas dependências.
- Estado compartilhado (semáforo por dispositivo, cache, registry) é a **mesma instância** entre dois escopos (pega `AddTransient`/`AddScoped` indevido).
- Serviço Scoped é **instância diferente** entre dois escopos e igual dentro do mesmo.
- Concorrência: N requests paralelos no endpoint que usa DbContext não geram erro de "second operation started on this context".

## 5. Boas práticas
- `IAsyncLifetime` para setup/teardown assíncrono.
- Dados de teste criados pelo próprio teste (arrange explícito), sem depender de ordem de execução.
- Assert no efeito observável (resposta HTTP, linha no banco, mensagem publicada, evento no hub), não em chamada interna.
- Rodar com filtro durante o desenvolvimento; suíte completa antes do PR.
