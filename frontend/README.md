# ⚙️ Smart Home Hub: Interface do Front-end

Este diretório contém o ecossistema de Front-end do **Smart Home Hub**. Ele é uma Single Page Application (SPA) de alta performance desenvolvida em **React 19**, **TypeScript** e **Tailwind CSS**, estruturada sob as regras rígidas do **Feature-Sliced Design (FSD)** e otimizada para processamento de fluxos de dados de telemetria IoT em tempo real.

---

## 📚 Documentação Aprofundada (Docs)

Para entender os pormenores das decisões técnicas, contratos de rede e estratégias de gerenciamento de cache e performance, consulte os documentos detalhados na pasta `docs`:

- [**⚛️ Diretrizes Arquiteturais e Padrões de Código**](./docs/architecture.md) *(FSD Estrito, Zustand vs TanStack Query, Tratamento de ProblemDetails e Validação)*
- [**📊 Engenharia de Estado e Telemetria em Tempo Real**](./docs/telemetry-and-state.md) *(Estratégias de Cache, Polling de Sensores, Recharts Responsivo e SignalR/WebSockets)*
- [**🏆 Estratégia de Testes no Front-end**](./docs/testing-strategy.md) *(Testes de Integração de UI, Isolamento com MSW, Vitest e React Testing Library)*

---

## 🏗️ Resumo da Arquitetura (Camadas do FSD)

A aplicação segue a metodologia **Feature-Sliced Design (FSD)**. O projeto é dividido em camadas concêntricas com **direção de dependência estrita de cima para baixo**. Camadas inferiores são agnósticas e nunca conhecem as regras das camadas superiores.

```
src/
├── app/          ← Providers, Router, estilos globais
├── pages/        ← Contêineres de rota (zero lógica de negócio)
├── widgets/      ← Camada de integração (apenas quando há cruzamento real entre features)
├── features/     ← Domínios isolados (auth, dashboard, devices)
└── core/         ← Fundação agnóstica (apiClient, ui, logger, errors)
```

| Camada | Responsabilidade |
|---|---|
| `app/` | Orquestrador global (Providers, Router). Não contém regra de negócio. |
| `pages/` | Contêineres de rotas. Apenas unem layouts e injetam parâmetros da URL. |
| `widgets/` | **Camada de Integração (Opcional).** O único local onde é permitido cruzar domínios. Usado estritamente para blocos estruturais que consomem múltiplas features (ex: um `Header` que une UI genérica + estado de `auth` + dropdown de `notifications`). |
| `features/` | Onde a mágica acontece. Fatias de domínio isoladas. **Regra de ouro: features nunca importam entre si diretamente.** |
| `core/` | Código puramente genérico e agnóstico (UI atômica, Axios). **Proibido** importar de qualquer camada acima. |

---

### 🌌 1. `src/app`

**O acoplador máximo e ponto de entrada da aplicação.**

Contém a inicialização de todos os contextos globais (`QueryClientProvider`, `AuthProvider`), o arquivo de roteamento centralizado (`Router.tsx`) e a injeção de estilos globais do Tailwind. Não possui regras de negócio — seu único trabalho é colar os módulos do sistema.

---

### 📄 2. `src/pages`

**Contêineres lógicos vinculados às rotas.**

São componentes puramente estruturais (ex: `LoginPage.tsx`, `DashboardPage.tsx`). Possuem **zero lógica de negócio** e não declaram marcação complexa de UI. O trabalho de uma página é ler parâmetros da URL, invocar os widgets e features necessários e injetá-los no layout correspondente.

---

### 🧩 3. `src/widgets`

**Camada de Integração — o único terreno neutro do sistema.**

> **Crie esta pasta apenas quando o primeiro componente multi-feature aparecer de verdade.** Pastas vazias por antecipação são burocracia, não arquitetura.

O `widgets/` existe para resolver a armadilha de dependência que ocorre ao tentar alocar componentes que cruzam domínios:

- Colocar no `core/` viola o isolamento — a base do sistema passaria a depender de features específicas.
- Colocar em outra `feature/` cria acoplamento horizontal proibido entre features.
- Colocar em `pages/` suja a responsabilidade da camada de rota.

O `widgets/` é o único local onde é **legalmente permitido** combinar UI genérica do `core/` com lógica de múltiplas features. O exemplo principal é o **App Shell** (`widgets/layout`), constituído por `DashboardLayout.tsx`, `Header.tsx` e `Sidebar.tsx`. O `Header` é um widget porque consome simultaneamente dados de `auth` (avatar, logout) e futuramente de `notifications` (badge de alertas).

---

### 🎯 4. `src/features`

**Slices verticais de domínio de negócio — o coração reativo.**

Cada pasta representa um domínio funcional independente (`auth`, `dashboard`, `devices`). Features têm isolamento total e contêm suas próprias subpastas:

| Subpasta | Responsabilidade | Exemplo |
|---|---|---|
| `api/` | Requisições HTTP da fatia via Axios | `auth.api.ts` |
| `components/` | Partes visuais encapsuladas | `LoginForm.tsx`, `EnergyChart.tsx` |
| `hooks/` | Orquestradores de estado assíncrono e Zod | `useLoginForm.ts` |
| `store/` | Estado de cliente global da fatia via Zustand | `auth.store.ts` |
| `types/` | Contratos de interfaces e schemas de validação | `auth.types.ts` |

> **Regra inviolável:** features **nunca importam entre si diretamente**. Se `dashboard` precisa do usuário logado, ele consome a store de `auth` — nunca importa um componente de dentro de `auth/components/`.

---

### 🛠️ 5. `src/core` (Shared)

**A fundação tecnológica indestrutível e agnóstica de negócio.**

Contém utilitários reutilizáveis de baixo nível que não sabem o que o sistema faz. **Nenhuma regra de Smart Home entra aqui.**

| Subpasta | Responsabilidade |
|---|---|
| `api/` | Instância central do `apiClient` (Axios) com interceptor assíncrono do Firebase JWT |
| `components/ui/` | Biblioteca atômica do shadcn/ui (Inputs, Dialogs, Dropdowns puros) |
| `errors/` | Type Guards (`app.errors.ts`) para parsear erros RFC 7807 |
| `logger/` | Serviço corporativo de observabilidade (`app.logger.ts`) |
| `lib/` | Inicializadores de SDKs terceiros (`firebase.ts`, `react-query.ts`) |

---

## 🚀 Matriz de Fluxo de Dados e Defesas Técnicas

O front-end opera em sincronia com os princípios do back-end:

**1. Injeção Transparente de Tokens**
O cliente HTTP intercepta as requisições assincronamente. O SDK do Firebase garante a rotação automática do JWT em background sem gerar deslogues acidentais.

**2. Defesa de Performance no DOM**
É proibido o uso de `index` em iterações de listas JSX. Chaves estáveis e reais (`item.id`) evitam remontagens custosas no Virtual DOM durante atualizações de telemetria em tempo real.

**3. Validação Progressiva**
Formulários utilizam `mode: "onSubmit"` para não irritar o usuário durante a digitação inicial. Uma vez disparado o primeiro erro, o comportamento muda dinamicamente para `reValidateMode: "onChange"`, auxiliando na correção em tempo real.

**4. Isolamento de Erros Sem `any`**
Exceções capturadas no cliente passam por validação de instância (`instanceof Error` + Type Guards), limpando stack traces técnicos e exibindo mensagens polidas na UI.

---

## 🏆 Qualidade, Padronização e Tooling

**Linter & Formatter — Biome**
Toda a governança do código (estilo, segurança, acessibilidade) é delegada ao Biome. Ele substitui de forma integrada o Babel/ESLint/Prettier com velocidade ultra-rápida e zero configuração adicional.

**Nomenclatura Estrita**
Arquivos obrigatoriamente assinam sufixos funcionais claros, garantindo previsibilidade imediata para qualquer engenheiro do ecossistema:

| Sufixo | Tipo |
|---|---|
| `.api.ts` | Camada de requisições HTTP |
| `.store.ts` | Estado global Zustand |
| `.types.ts` | Interfaces e schemas Zod |
| `.hooks.ts` | Hooks de orquestração |
| `.tsx` | Componentes visuais |