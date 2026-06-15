# 🗺️ Visão Geral e Roadmap: Smart Home Hub IoT

## 1. Visão Geral do Projeto
Um orquestrador local de Casa Inteligente focado em alta performance e interoperabilidade. O sistema recebe dados de dispositivos comerciais (ex: Sonoff, Tuya) via protocolo MQTT, processa essas telemetrias no back-end utilizando regras complexas de negócio, e reflete as mudanças instantaneamente em um painel de controle na web.

## 2. A Stack Tecnológica
* **Infraestrutura:** Docker (hospedando o banco e o broker).
* **Banco de Dados:** PostgreSQL (dados relacionais) + TimescaleDB (séries temporais para logs de sensores).
* **Mensageria:** Eclipse Mosquitto (Broker MQTT) para comunicação com o hardware.
* **Segurança:** Firebase Auth (gerenciamento de usuários e tokens JWT).
* **Back-end:** C# .NET 8/9 (ASP.NET Core Minimal APIs + Worker Services).
* **Front-end:** React + TypeScript (Gerenciamento de estado com Zustand e tempo real via SignalR).

## 3. Roadmap de Desenvolvimento (Passo a Passo)

### ✅ Fase 1: Fundação da Infraestrutura
* [X] Criar o arquivo docker-compose.yml (com volumes persistentes e .env).
* [X] Configurar o contêiner do PostgreSQL com a extensão do TimescaleDB.
* [X] Configurar o contêiner do Eclipse Mosquitto (Broker MQTT).
* [X] Garantir comunicação interna na rede do Docker.

### ✅ Fase 2: O Motor do Back-end e a Segurança (C# + Firebase)
* [X] Criar o projeto ASP.NET Core Web API.
* [X] Configurar o Entity Framework Core e mapear Entidades (Usuário, Ambiente).
* [X] Integrar a validação do token JWT do Firebase no middleware da API.
* [X] Criar CRUD de Ambientes (Rooms) com CQRS.
* [X] Implementar a arquitetura de Validação e Respostas (Result Pattern, FluentValidation e GlobalExceptionHandler).
* [X] Padronizar 100% dos Handlers e Endpoints de Rooms para a nova arquitetura.
* [X] Criar o CRUD de Dispositivos (Devices) utilizando os mesmos padrões.

### 🔄 Fase 3: A Comunicação IoT e Base de Testes (Fase Atual)
* [X] Criar Background Service no .NET conectado ao Mosquitto.
* [X] Padronizar topologia MQTT: home/telemetry/{deviceId} e home/commands/{deviceId}.
* [X] Criar script simulador (Python/Node) para disparar mensagens de teste.
* [X] Processar payload JSON no C# e salvar logs no TimescaleDB.
* [ ] Implementar a infraestrutura automatizada do Troféu de Testes (Testcontainers).

### ⏳ Fase 4: O Painel de Controle (React + TS)
* [ ] Configurar roteamento e tela de Login (Firebase Auth SDK).
* [ ] Desenvolver Dashboard consumindo a API (Zustand para estado global granular).
* [ ] Configurar SignalR para atualizar componentes específicos em tempo real.

### ⏳ Fase 5: O Cérebro das Automações (Rules Engine)
* [ ] Isolar a lógica de automação utilizando o Mediator.
* [ ] Estruturar automações com Máquinas de Estado Finito (FSM) no domínio.
* [ ] Criar interface no React para o usuário desenhar suas regras lógicas.

## 4. Visão de Futuro (Roadmap v2.0 e Escala)
Esta seção mapeia as evoluções arquiteturais para quando o Hub atingir maturidade na rede local.

* **10.1. Integração Híbrida com a Nuvem (Cloud Proxy):** Criar um serviço de Túnel Reverso (WebSocket criptografado) para acessar a casa remotamente sem expor portas do roteador (Port Forwarding).
* **10.2. Transição para Microsserviços:** Extrair fatias do monólito. Exemplo: Um *Telemetry Worker* em Go/Rust exclusivo para engolir milhares de mensagens MQTT, e um *Rules Engine* isolado.
* **10.3. Observabilidade e Monitoramento:** Integrar Prometheus + Grafana para alertar sobre bateria fraca de sensores ou quedas de Wi-Fi.
* **10.4. IA e Automações Preditivas:** Usar o TimescaleDB para treinar Machine Learning e sugerir rotinas baseadas nos hábitos do usuário.
* **10.5. Assistentes de Voz:** Desenvolver Custom Skills (Alexa/Google) que conversem com o nosso Cloud Proxy, mantendo o Hub local como o cérebro das integrações.