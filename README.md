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

- [X] Configurar ambiente do cliente (Vite + TypeScript + Tailwind CSS)
- [X] Instalar ecossistema de infraestrutura: React Router, TanStack Query e Zustand
- [ ] Configurar framework de testes unitários e de componentes utilizando Vitest e React Testing Library
- [ ] Configurar suíte de testes End-to-End (E2E) com o Playwright
- [ ] Configurar i18n (`react-i18next`) para suporte nativo a Português e Inglês
- [ ] Adicionar e padronizar o Design System utilizando Shadcn UI
- [ ] Implementar fluxo de Autenticação (Firebase Auth) e proteção de rotas (Private Routes)
- [ ] Desenvolver Dashboard: consumir API paginada e validada via React Hook Form + Zod
- [ ] Integrar WebSockets (`@microsoft/signalr`) para espelhar as mudanças de telemetria em tempo real
- [ ] Plotar gráficos de consumo histórico de sensores utilizando Recharts

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