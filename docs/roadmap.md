# 🗺️ Visão Geral e Roadmap: Smart Home Hub IoT

## 1. Visão Geral do Projeto
Um orquestrador local de Casa Inteligente focado em alta performance e interoperabilidade. O sistema recebe dados de dispositivos comerciais (ex: Sonoff, Tuya) via protocolo MQTT, processa essas telemetrias no back-end utilizando regras complexas de negócio, e reflete as mudanças instantaneamente em um painel de controle na web.

## 2. A Stack Tecnológica
* **Infraestrutura:** Docker (hospedando o banco e o broker).
* **Banco de Dados:** PostgreSQL (dados relacionais) + TimescaleDB (séries temporais para logs de sensores).
* **Mensageria:** Eclipse Mosquitto (Broker MQTT) para comunicação com o hardware.
* **Segurança:** Firebase Auth (gerenciamento de usuários e tokens JWT).
* **Back-end:** C# .NET 8/9 (ASP.NET Core Minimal APIs + Worker Services).
* **Observabilidade e Documentação:** Serilog (Structured Logging) + Scalar (OpenAPI UI).
* **Front-end:** React + TypeScript (Gerenciamento de estado com Zustand e tempo real via SignalR).

## 3. Roadmap de Desenvolvimento (Passo a Passo)

### ✅ Fase 1: Fundação da Infraestrutura
* [X] Criar o arquivo docker-compose.yml (com volumes persistentes e .env).
* [X] Configurar o contêiner do PostgreSQL com a extensão do TimescaleDB.
* [X] Configurar o contêiner do Eclipse Mosquitto (Broker MQTT).
* [X] Garantir comunicação interna na rede do Docker.

### ✅ Fase 2: O Motor do Back-end, Segurança e Observabilidade
* [X] Criar o projeto ASP.NET Core Web API.
* [X] Configurar o Entity Framework Core e mapear Entidades (Usuário, Ambiente, Dispositivo, Grupo de Dispositivos).
* [X] Integrar a validação do token JWT do Firebase no middleware da API.
* [X] Implementar a arquitetura de Validação e Respostas (Result Pattern, FluentValidation e GlobalExceptionHandler).
* [X] Criar CRUD completo de Ambientes (Rooms), Dispositivos (Devices) e Grupos de Dispositivos (DeviceGroups) com CQRS e isolamento multi-tenant.
* [X] Substituir o provedor nativo de log pelo **Serilog**, configurando escrita estruturada no Console e em Arquivo Local.
* [X] Remover dependências antigas de Swagger e integrar o **Scalar API Documentation** (`Microsoft.AspNetCore.OpenApi` + `Scalar.AspNetCore`).

### ✅ Fase 3: A Comunicação IoT e Base de Testes 
* [X] Criar Background Service no .NET conectado ao Mosquitto.
* [X] Padronizar topologia MQTT: home/telemetry/{deviceId} e home/commands/{deviceId}.
* [X] Criar script simulador (Python/Node) para disparar mensagens de teste.
* [X] Processar payload JSON no C# e salvar logs no TimescaleDB.
* [X] Implementar a infraestrutura automatizada do Troféu de Testes (Testcontainers) com cobertura completa do CRUD e regras de segurança.
* [X] Criar estrutura genérica de **Paginação de Queries** (`PagedResult<T>`) e aplicá-la na listagem de telemetrias e históricos de notificações.

### ⏳ Fase 4: O Painel de Controle (React + TS) (Fase Atual)
* [ ] Configurar roteamento e tela de Login (Firebase Auth SDK).
* [ ] Desenvolver Dashboard consumindo a API paginada e validada através da documentação do Scalar.
* [ ] Configurar SignalR para atualizar componentes específicos em tempo real.

### ⏳ Fase 5: O Cérebro das Automações (Rules Engine)
* [ ] Isolar a lógica de automação utilizando o Mediator.
* [ ] Estruturar automações com Máquinas de Estado Finito (FSM) no domínio.
* [ ] Criar interface no React para o usuário desenhar suas regras lógicas.

## 4. Visão de Futuro (Roadmap v2.0 e Escala)
* **10.1. Integração Híbrida com a Nuvem (Cloud Proxy):** Acesso remoto seguro sem Port Forwarding.
* **10.2. Transição para Microsserviços:** Extrair fatias do monólito (Telemetry Worker em Go/Rust).
* **10.3. Centralização de Telemetria:** Integrar Prometheus + Grafana consumindo do TimescaleDB.
* **10.4. IA e Automações Preditivas:** Treinar Machine Learning com base nos hábitos históricos de consumo do usuário.
* **10.5. Assistentes de Voz:** Desenvolver Custom Skills (Alexa/Google) conversando com o Cloud Proxy.