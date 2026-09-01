# ⚙️ Smart Home Hub — Motor de Back-end

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-PostgreSQL-FDB515?logo=postgresql)](https://www.timescale.com/)
[![MQTT](https://img.shields.io/badge/Broker-Mosquitto-660066?logo=eclipsemosquitto)](https://mosquitto.org/)

Monólito modular em C# (.NET 10), desenhado com **Clean Architecture**, **CQRS** (Command Query Responsibility Segregation) e princípios de **Domain-Driven Design**. Veja o [README raiz](../README.md) para visão geral do ecossistema e instruções de setup do ambiente completo (Docker, `.env`, front-end).

---

## 📚 Documentação Aprofundada

- [**🏛️ Diretrizes Arquiteturais e Padrões de Código**](./docs/architecture.md) — CQRS, NRTs, Pipeline Behavior, tratamento de erros
- [**📡 Engenharia de Dados e Comunicação IoT**](./docs/database-iot.md) — MQTT, TimescaleDB, Soft Delete, índices
- [**🏆 Estratégia de Testes (Troféu de Testes)**](./docs/testing-strategy.md) — Testcontainers, padrão AAA, cenários de regressão

---

## 🏗️ Camadas do Monólito

### 💎 1. SmartHomeHub.Domain
**O núcleo central e a camada mais isolada.**

Regras de negócio puras, entidades estruturais (`User`, `Room`, `Device`, `DeviceGroup`, `DeviceTelemetryLog`, `SystemEvent`), enums e primitivos de domínio (`Result`, `Error`). Sem dependência de pacotes externos ou frameworks — inclusive o vocabulário de tipos de evento (`SystemEventTypes`, usado pela trilha de auditoria) vive aqui, não na camada de aplicação, por ser conceito de domínio.

### 🚀 2. SmartHomeHub.Application
**O orquestrador das intenções do usuário (CQRS).**

*Commands*, *Queries*, *Validators* (FluentValidation) e *Handlers*. Usa o pacote **Mediator** (Source Generators, sem Reflection) para alocação zero de memória e performance máxima ao conectar os canais de entrada às regras de domínio.

**Convenção ao adicionar uma nova feature CQRS** (exemplo real: `GetEventHistoryStatsQuery`):
```
Features/<Contexto>/Queries|Commands/<NomeDaFeature>/
├── <NomeDaFeature>Query.cs        # record com os parâmetros
├── <NomeDaFeature>Handler.cs      # implementa IRequestHandler, retorna Result<T>
└── <NomeDaFeature>Validator.cs    # FluentValidation, se houver parâmetros a validar
```
Toda query/command retorna `Result<T>` (nunca lança exceção pra fluxo de controle), e é registrada nos endpoints via Minimal API em `SmartHomeHub.Api/Endpoints/`.

### 🛠️ 3. SmartHomeHub.Infrastructure
**O encanamento técnico com o mundo exterior.**

`AppDbContext` (EF Core), `IEntityTypeConfiguration` de cada entidade, migrações, e as conexões concretas com PostgreSQL, TimescaleDB e o broker MQTT.

### 🌐 4. SmartHomeHub.Api
**O ponto de entrada da aplicação (Host / Composition Root).**

Minimal APIs, pipeline HTTP, middlewares globais (`GlobalExceptionHandler`, validação de JWT do Firebase), registro de endpoints no Scalar, Serilog. Também hospeda os Worker Services em background.

**Worker Services em execução:**

| Worker | Camada | Responsabilidade |
|---|---|---|
| `MqttListenerWorker` | `Api` | Assina o tópico global `home/#` no broker Mosquitto e despacha `ProcessTelemetryCommand` pra cada mensagem recebida |
| `MockTelemetryWorker` | `Api` | **Apenas Development.** A cada 5s, gera telemetria plausível (Watts/temperatura) pra dispositivos `NativeMqtt`, respeitando `IsOn`, reaproveitando a pipeline real de processamento |
| `DeviceStatePollingWorker` | `Infrastructure` | Sincroniza periodicamente o estado real de TVs (ADB de rede) e da sessão Spotify conectada, registrando eventos de atividade quando o estado muda |
| `DeviceHealthCheckWorker` | `Infrastructure` | Detecta dispositivos que pararam de responder, marca como offline e registra o evento |

**Motor de descoberta automática** (`Infrastructure/Discovery`): `IDeviceDiscoveryManager` orquestra scanners plugáveis — **mDNS** (Chromecast/Google Cast), **SSDP/UPnP**, **MQTT Discovery** e **Tuya UDP local** — pra achar dispositivos na rede sem cadastro manual de IP/porta.

**Integrações de terceiros:** Spotify Web API (playback remoto) e Android TV/Google Cast via ADB sobre rede, expostas via `SpotifyEndpoints.cs`/`DeviceEndpoints.cs`.

### 🎯 5. SmartHomeHub.UnitTests
Testes rápidos e isolados em memória (milissegundos). Valida comportamento síncrono dos Handlers, invariantes de domínio e regras do FluentValidation.

### 🐳 6. SmartHomeHub.IntegrationTests
Estratégia do Troféu de Testes via **Testcontainers** — sobe contêineres Docker reais e descartáveis (PostgreSQL/TimescaleDB, Mosquitto) durante a execução, e valida persistência real, cascatas lógicas e regras multi-tenant via requisições HTTP integradas.

---

## 🧪 Rodando os Testes

```bash
# Todos de uma vez
dotnet test

# Só os rápidos (não precisa de Docker rodando)
dotnet test --filter FullyQualifiedName~SmartHomeHub.UnitTests

# Só os de integração (precisa do Docker ativo — sobe os containers via Testcontainers)
dotnet test --filter FullyQualifiedName~SmartHomeHub.IntegrationTests
```

Para subir a API localmente, veja a seção **Como Rodar** do [README raiz](../README.md).