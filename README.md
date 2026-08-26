# 🏠 Smart Home Hub IoT

Um orquestrador local de Casa Inteligente focado em alta performance, privacidade e interoperabilidade.

O sistema recebe dados de dispositivos comerciais (ex: Sonoff, Tuya) via protocolo MQTT, processa essas telemetrias no back-end utilizando regras complexas de negócio baseadas em Clean Architecture, e reflete as mudanças instantaneamente em um painel de controle na web utilizando WebSockets.

---

## 📚 Documentação do Ecossistema

Este repositório é um *Monorepo* que contém toda a stack do ecossistema. A documentação aprofundada de cada área está dividida em seus respectivos diretórios:

- [**⚙️ Documentação do Back-end**](./backend/README.md) *(Arquitetura Limpa, CQRS, Padrões de Código e EF Core)*
- [**🎨 Documentação do Front-end**](./frontend/README.md) *(Design System, React, Roteamento e Gerenciamento de Estado)*

---

## 🛠️ A Stack Tecnológica

O projeto foi desenhado utilizando padrões da indústria para garantir escalabilidade e baixa latência:

| Camada | Tecnologia |
|---|---|
| **Infraestrutura** | Docker (hospedando os bancos de dados e o broker) |
| **Banco de Dados** | PostgreSQL (dados relacionais) + TimescaleDB (séries temporais para logs de sensores) |
| **Mensageria** | Eclipse Mosquitto (Broker MQTT) para comunicação com o hardware |
| **Segurança** | Firebase Auth (gerenciamento de usuários e tokens JWT) |
| **Back-end** | C# .NET 10 (ASP.NET Core Minimal APIs + Worker Services) |
| **Observabilidade** | Serilog (Structured Logging) + Scalar (OpenAPI UI) |
| **Front-end** | React + TypeScript (Vite, Tailwind CSS, Shadcn UI, Zustand e TanStack Query) |
| **Tempo Real** | SignalR (WebSockets) para espelhamento de estado bidirecional |
| **Descoberta Automática** | Scanners mDNS, SSDP, MQTT Discovery e Tuya UDP para achar dispositivos na rede local sem cadastro manual |
| **Integrações de Terceiros** | Spotify Web API (playback remoto) e Android TV/Google Cast via ADB sobre rede (mídia, volume) |

---

## 🚀 Como Rodar o Projeto (Ambiente Local)

Para inicializar a infraestrutura completa de desenvolvimento na sua máquina:

**1. Pré-requisitos**

Certifique-se de ter o [Docker Desktop](https://www.docker.com/products/docker-desktop/) e o [.NET SDK](https://dotnet.microsoft.com/download) instalados.

**2. Clone o repositório**

```bash
git clone https://github.com/seu-usuario/smart-home-hub.git
cd smart-home-hub
```

**3. Suba a infraestrutura (Banco de Dados e MQTT)**

```bash
docker-compose up -d
```

> Instruções específicas de como iniciar as aplicações C# e React encontram-se nos READMEs das respectivas pastas.

---

## 🗺️ Roadmap de Desenvolvimento

### ✅ Fase 1: Fundação da Infraestrutura

- [x] Criar o arquivo `docker-compose.yml` (com volumes persistentes e `.env`)
- [x] Configurar o contêiner do PostgreSQL com a extensão do TimescaleDB
- [x] Configurar o contêiner do Eclipse Mosquitto (Broker MQTT)
- [x] Garantir comunicação interna na rede do Docker

### ✅ Fase 2: O Motor do Back-end, Segurança e Observabilidade

- [x] Criar o projeto ASP.NET Core Web API
- [x] Configurar o Entity Framework Core e mapear entidades (`User`, `Room`, `Device`, `DeviceGroup`)
- [x] Integrar a validação do token JWT do Firebase no middleware da API
- [x] Implementar a arquitetura de Validação e Respostas (Result Pattern, FluentValidation e GlobalExceptionHandler)
- [x] Criar CRUD completo de Ambientes, Dispositivos e Grupos com CQRS (Mediator) e isolamento multi-tenant
- [x] Substituir o provedor nativo de log pelo Serilog, configurando escrita estruturada
- [x] Integrar o Scalar API Documentation

### ✅ Fase 3: A Comunicação IoT e Base de Testes

- [x] Criar Background Service no .NET conectado ao Mosquitto
- [x] Padronizar topologia MQTT baseada em identidade (`home/telemetry/{deviceId}`)
- [x] Processar payload JSON no C# e salvar logs no TimescaleDB em formato Append-Only
- [x] Implementar a infraestrutura automatizada do Troféu de Testes (Testcontainers) com cobertura de regressão e segurança
- [x] Criar motor genérico de Paginação de Queries na camada de Aplicação e repassar aos Handlers

### ⏳ Fase 4: O Painel de Controle — React + TypeScript *(Fase Atual)*

#### 🚀 Fase 4.1: Consolidação da Base & Autenticação (Praticamente Concluída)
 
- [x] Configurar ambiente do cliente (Vite + TypeScript + Tailwind CSS)
- [x] Instalar ecossistema: React Router, TanStack Query e Zustand
- [x] Adicionar e padronizar o Design System utilizando Shadcn UI / Radix
- [x] Implementar fluxo de Autenticação (Firebase Auth) e proteção de rotas (`ProtectedRoute` e `PublicRoute`)
- [x] Sincronização de usuário do Firebase com o banco PostgreSQL (`/users/sync`)

#### Fase 4.2: Gestão de Dispositivos (Devices) (Concluída)
 
- [x] Listagem de dispositivos com busca, abas de categoria e status online/offline
- [x] Card de dispositivo com Toggle otimista (Soft Delete / Inversão de estado)
- [x] Modais/Sheets para Criar, Editar e Excluir Dispositivo
- [x] Mapeamento dos tipos de atuadores (incluindo `Television`)

#### Fase 4.3: Gestão de Ambientes (Rooms) (Concluída)
 
- [X] Criar a `feature/rooms` (API, Hooks com TanStack Query, Store)
- [X] Implementar a página/modal de listagem e cadastro de Cômodos (Sala, Cozinha, Garagem)
- [X] Conectar os cômodos reais criados no backend aos dropdowns de seleção dos Dispositivos (substituindo a opção mocada "Sem cômodo")

#### Fase 4.4: Grupos de Dispositivos (Device Groups) (Em andamento)
 
- [X] Criar a `feature/device-groups` no frontend
- [X] Implementar listagem paginada e cards de Grupos de Dispositivos (ex: "Todas as Luzes da Sala")
- [X] Interface para criar/editar grupos selecionando múltiplos dispositivos (Checkboxes)
- [ ] Ação em massa (Ligar/Desligar todos os dispositivos do grupo com um único clique)

#### Fase 4.5: Telemetria em Tempo Real & Métricas (Concluída)
    
- [x] Consumo da rota `/dashboard/overview` no TanStack Query com gráficos do Recharts
- [X] Integrar WebSockets via `@microsoft/signalr` para ouvir eventos e atualizar a tela sem dar F5
- [X] Modal de detalhes do dispositivo exibindo gráficos históricos de consumo/temperatura
- [X] Consumo de energia real (não mocado): média de potência por dispositivo/balde de 5 min agregada em série histórica, sem distorção por frequência de amostragem
- [X] Separação visual entre **potência instantânea** (gráfico, kW/W — "quanto a casa está puxando agora") e **energia acumulada** (card de KPI, kWh/Wh — "acumulado hoje"), com auto-escala de unidade
- [X] Consumo de energia real por Ambiente (card por cômodo, agregado a partir da mesma base do gráfico)
- [X] Linha do tempo de atividades (`/dashboard/activity-log`) persistida no banco (`SystemEvent`), substituindo o mock client-side — populada por toggles manuais, polling de TV/Spotify e health check de conectividade
- [X] Temperatura média do dia com tendência vs. dia anterior, calculada a partir da telemetria real de sensores/termostatos

#### Fase 4.6: Testes, Qualidade & i18n
 
- [X] Configurar i18n (`react-i18next`) para suporte a Português e Inglês
- [X] Configurar Vitest + React Testing Library para testes de componentes e hooks
- [X] Configurar Playwright para testes End-to-End (E2E) simulando login e criação de dispositivos

#### Fase 4.7: Descoberta Automática & Integrações de Terceiros *(implementada, fora do roadmap original)*

- [X] Motor de descoberta de dispositivos na rede local (`IDeviceDiscoveryManager`), combinando scanners **mDNS**, **SSDP/UPnP**, **MQTT Discovery** e **Tuya UDP local**
- [X] Fluxo de UI de descoberta (`DeviceDiscoveryModal`) em 3 passos: escanear → encontrado → configurar/nomear → concluído
- [X] Integração real com **Spotify Web API**: conectar conta, ver "tocando agora", pular faixa, controlar volume e play/pause direto do card do dispositivo
- [X] Controle de **Android TV / Google Cast via ADB de rede** (`GoogleTvNetworkService`): ligar/desligar, mídia em reprodução e volume, sem depender de infravermelho
- [X] Worker de polling (`DeviceStatePollingWorker`) sincronizando estado real de TV/Spotify periodicamente e gerando eventos de atividade quando o estado muda
- [X] Worker de health check (`DeviceHealthCheckWorker`) detectando dispositivos que ficaram offline e registrando o evento

#### Fase 4.8: Dev Tools Hub *(implementada, fora do roadmap original — apenas ambiente de desenvolvimento)*

Simulador isolado de produção pra testar o ecossistema (dispositivos, telemetria, dashboard em tempo real) sem hardware físico. Gateado em ambos os lados: endpoints só existem com `env.IsDevelopment()` no back-end e a rota/chunk só existe com `import.meta.env.DEV` no front-end (tree-shaken do build de produção).

- [X] `POST /api/dev/seed-mock-house` — gera uma casa mock completa (4 ambientes, 12 dispositivos de todos os tipos)
- [X] `POST /api/dev/clear-mock-house` — remove (soft delete) só o que o seed criou, sem tocar em dados reais
- [X] `POST /api/dev/emit-telemetry` e `POST /api/dev/toggle-connectivity` — disparam a pipeline real de telemetria/conectividade pra um dispositivo específico
- [X] `MockTelemetryWorker` — a cada 5s, gera telemetria plausível (Watts/temperatura) pra todos os dispositivos `NativeMqtt`, respeitando o estado ligado/desligado real, animando os gráficos do dashboard sem ação manual repetida
- [X] Tela `/dev-tools` (sem link no menu, acesso só por URL direta) reaproveitando a pipeline real de persistência + notificação SignalR

### ⏳ Fase 5: O Cérebro das Automações (Rules Engine)

- [ ] Isolar a lógica de automação utilizando o Mediator
- [ ] Estruturar automações com Máquinas de Estado Finito (FSM) no domínio
- [ ] Criar interface visual (drag-and-drop) para o usuário desenhar suas regras lógicas

---

## 🔮 Visão de Futuro (Roadmap v2.0 e Escala)

**☁️ Integração Híbrida com a Nuvem (Cloud Proxy)**
Acesso remoto seguro de fora de casa sem necessidade de Port Forwarding no roteador.

**🔬 Transição para Microsserviços**
Extrair a alta volumetria do monólito, reescrevendo o Telemetry Worker em linguagens de baixo nível como Go ou Rust.

**📊 Centralização de Telemetria**
Integrar a stack Prometheus + Grafana consumindo diretamente as agregações contínuas do TimescaleDB.

**🤖 IA e Automações Preditivas**
Treinar modelos locais de Machine Learning com base nos hábitos históricos de consumo (ex: acender a luz da varanda minutos antes do usuário chegar).

**🎙️ Assistentes de Voz**
Desenvolver Custom Skills para Alexa e Google Assistant, conversando diretamente com o Cloud Proxy.