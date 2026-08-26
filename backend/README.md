# ⚙️ Smart Home Hub: Motor de Back-end

Este diretório contém o coração do ecossistema Smart Home Hub. Ele é um monólito modular de alta performance desenvolvido em C# (.NET 10), desenhado utilizando as melhores práticas da **Clean Architecture** (Arquitetura Limpa), **CQRS** (Command Query Responsibility Segregation) e princípios de **Domain-Driven Design (DDD)**.

---

## 📚 Documentação Aprofundada (Docs)

Para entender os pormenores das decisões técnicas, regras de banco de dados e as estratégias de qualidade do código, consulte os documentos detalhados na pasta `docs`:

- [**🏛️ Diretrizes Arquiteturais e Padrões de Código**](./docs/architecture.md) *(CQRS, Padrões NRTs, Pipeline Behavior e Tratamento de Erros)*
- [**📡 Engenharia de Dados e Comunicação IoT**](./docs/database-and-iot.md) *(MQTT, TimescaleDB, Soft Delete e Índices)*
- [**🏆 Estratégia de Testes (O Troféu de Testes)**](./docs/testing-strategy.md) *(Testcontainers, Padrão AAA e Cenários de Regressão)*

---

## 🏗️ Resumo da Arquitetura (Camadas do Monólito)

A solução está dividida em camadas estritas para garantir o isolamento das regras de negócio em relação à infraestrutura tecnológica.

### 💎 1. SmartHomeHub.Domain

**O núcleo central e a camada mais isolada da aplicação.**

Contém a definição das regras de negócio puras, entidades estruturais (`User`, `Room`, `Device`, `DeviceTelemetryLog`), Enums e os primitivos de domínio (como as classes base de `Result` e `Error`). Não possui nenhuma dependência de pacotes externos ou frameworks.

---

### 🚀 2. SmartHomeHub.Application

**O orquestrador das intenções do usuário (CQRS).**

Aqui vivem todos os *Commands*, *Queries*, *Validators* (FluentValidation) e os *Handlers* responsáveis por executar as ações. Ela conecta os canais de entrada às regras do domínio utilizando o pacote **Mediator** (via Source Generators) para alocação zero de memória e máxima performance, dispensando o uso de Reflection.

---

### 🛠️ 3. SmartHomeHub.Infrastructure

**O encanamento técnico e suporte tecnológico com o mundo exterior.**

Implementa o contexto do Entity Framework Core (`AppDbContext`), as classes de mapeamento e configuração de tabelas (`IEntityTypeConfiguration`), as migrações de banco de dados e as conexões concretas com o PostgreSQL, TimescaleDB e broker MQTT.

---

### 🌐 4. SmartHomeHub.Api

**O ponto de entrada da aplicação (Host / Composition Root).**

Expõe as Minimal APIs para o mundo exterior. É responsável por configurar o pipeline de requisições HTTP, middlewares globais (`GlobalExceptionHandler`, Firebase JWT), registrar as coleções de endpoints no Scalar e inicializar o mecanismo de logs estruturados do Serilog. Também hospeda serviços em background (Worker Services).

**Worker Services em execução:**

| Worker | Camada | Responsabilidade |
|---|---|---|
| `MqttListenerWorker` | `Api` | Assina o tópico global `home/#` no broker Mosquitto e despacha `ProcessTelemetryCommand` pra cada mensagem recebida |
| `MockTelemetryWorker` | `Api` | **Apenas Development.** A cada 5s, gera telemetria plausível (Watts/temperatura) pra dispositivos `NativeMqtt`, respeitando `IsOn`, reaproveitando a pipeline real de processamento — permite testar o dashboard sem hardware |
| `DeviceStatePollingWorker` | `Infrastructure` | Sincroniza periodicamente o estado real de TVs (via ADB de rede) e da sessão Spotify conectada, registrando eventos de atividade quando o estado muda |
| `DeviceHealthCheckWorker` | `Infrastructure` | Detecta dispositivos que pararam de responder e marca como offline, registrando o evento |

**Motor de descoberta automática de dispositivos** (`Infrastructure/Discovery`): `IDeviceDiscoveryManager` orquestra scanners plugáveis — **mDNS** (Chromecast/Google Cast), **SSDP/UPnP**, **MQTT Discovery** (payloads auto-anunciados) e **Tuya UDP local** — pra encontrar dispositivos na rede sem exigir cadastro manual de IP/porta.

**Integrações de terceiros:** Spotify Web API (playback remoto — conectar conta, now playing, skip, volume) e Android TV/Google Cast via ADB sobre rede (liga/desliga, mídia, volume), ambas expostas via `SpotifyEndpoints.cs`/`DeviceEndpoints.cs` e consumidas pelo front-end sem depender de infravermelho ou apps proprietários.

---

### 🎯 5. SmartHomeHub.UnitTests

**A suíte de testes rápidos e de isolamento lógico.**

Testa blocos lógicos isolados em memória (milissegundos) utilizando simulações rápidas. Valida comportamentos síncronos dos Handlers, invariantes de domínio e regras estritas do FluentValidation.

---

### 🐳 6. SmartHomeHub.IntegrationTests

**A suíte de testes ponta a ponta (E2E) simulando a infraestrutura de produção.**

Utiliza a estratégia do Troféu de Testes via **Testcontainers**, levantando contêineres Docker reais descartáveis (PostgreSQL, TimescaleDB, Eclipse Mosquitto) durante a execução. Dispara requisições HTTP integradas para validar a persistência real dos dados, cascatas lógicas e regras multi-tenant.