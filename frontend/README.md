# ⚙️ Smart Home Hub — Interface do Front-end

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

Single Page Application em **React 19**, **TypeScript** e **Tailwind CSS v4**, estruturada sob as regras rígidas do **Feature-Sliced Design (FSD)** e otimizada para processar fluxos de telemetria IoT em tempo real. Veja o [README raiz](../README.md) para visão geral do ecossistema e setup do ambiente completo.

---

## 📚 Documentação Aprofundada

- [**⚛️ Diretrizes Arquiteturais e Padrões de Código**](./docs/architecture.md) — FSD estrito, Zustand vs TanStack Query, ProblemDetails e validação
- [**📊 Engenharia de Estado e Telemetria em Tempo Real**](./docs/telemetry-and-state.md) — cache, polling, Recharts, SignalR/WebSockets
- [**🏆 Estratégia de Testes**](./docs/testing-strategy.md) — testes de integração de UI, MSW, Vitest e React Testing Library
- [**🎨 Diretrizes de UI, Espaçamento e Design System**](./docs/ui-and-design-system.md) — escada de superfícies, escala de espaçamento/raio/tipografia, componentização estrita

---

## 🏗️ Camadas do FSD

Camadas concêntricas com **direção de dependência estrita de cima para baixo** — camadas inferiores são agnósticas e nunca conhecem as regras das superiores.

```
src/
├── app/          ← Providers, Router, estilos globais
├── pages/        ← Contêineres de rota (zero lógica de negócio)
├── widgets/      ← Camada de integração (só quando há cruzamento real entre features)
├── features/     ← Domínios isolados (auth, history, automations, devices...)
└── core/         ← Fundação agnóstica (api client, ui, logger, errors)
```

| Camada | Responsabilidade |
|---|---|
| `app/` | Orquestrador global (Providers, Router). Não contém regra de negócio. |
| `pages/` | Contêineres de rotas. Apenas unem layouts e injetam parâmetros da URL. |
| `widgets/` | **Camada de integração (opcional).** Único local onde é permitido cruzar domínios — ex: um `Header` que une UI genérica + estado de `auth`. |
| `features/` | Fatias de domínio isoladas. **Regra de ouro: features nunca importam entre si diretamente.** |
| `core/` | Código puramente genérico e agnóstico. **Proibido** importar de qualquer camada acima. |

---

### 🌌 1. `src/app`
Inicialização dos contextos globais (`QueryClientProvider`, providers de auth), roteamento centralizado e injeção de estilos globais do Tailwind. Zero regra de negócio — só cola os módulos do sistema.

### 📄 2. `src/pages`
Componentes puramente estruturais e vinculados a rotas. Zero lógica de negócio: leem parâmetros da URL, invocam widgets/features e injetam no layout.

### 🧩 3. `src/widgets`
**Camada de integração — o único terreno neutro do sistema.**

> Crie esta pasta apenas quando o primeiro componente multi-feature aparecer de verdade. Pastas vazias por antecipação são burocracia, não arquitetura.

Hoje existe `widgets/layout/`, com o App Shell: `AppLayout.tsx` (shell autenticado, com `Header.tsx` + `Sidebar.tsx`) e `AuthLayout.tsx` (shell das telas de login/registro). O `Header` é um widget porque consome simultaneamente dados de `auth` (avatar, logout) e, futuramente, de notificações.

### 🎯 4. `src/features`
**Slices verticais de domínio — o coração reativo.**

Cada pasta é um domínio funcional independente, com isolamento total:

| Subpasta | Responsabilidade | Exemplo real |
|---|---|---|
| `api/` | Requisições HTTP da fatia via Axios | `history.api.ts` |
| `components/` | Partes visuais encapsuladas | `HistoryTimeline.tsx` |
| `hooks/` | Orquestradores de estado assíncrono | `useEventHistory.ts` |
| `store/` | Estado de cliente da fatia via Zustand | `history-ui.store.ts` |
| `types/` | Contratos de interfaces e schemas | `history.types.ts` |
| `constants/` | Mapas de ícone/cor/label estáticos | `history.constants.ts` |

> **Regra inviolável:** features nunca importam entre si diretamente. Se `dashboard` precisa do usuário logado, consome a store de `auth` — nunca importa um componente de dentro de `auth/components/`.

**Features existentes:** `auth`, `dashboard`, `devices`, `rooms`, `device-groups`, `automations`, `history`, `integrations` (Spotify), `settings` e `dev` (Dev Tools Hub).

O `dev` é um caso especial: existe só em ambiente de desenvolvimento. A rota `/dev-tools` é importada condicionalmente em `Router.tsx` via `import.meta.env.DEV ? lazy(...) : null` — em build de produção o literal vira `false`, o `import()` dinâmico fica inalcançável e o Rollup remove o chunk inteiro. Sem link no menu, acesso só por URL direta.

### 🛠️ 5. `src/core`
**A fundação tecnológica agnóstica de negócio.** Nenhuma regra de Smart Home entra aqui.

| Subpasta | Responsabilidade | Arquivo real |
|---|---|---|
| `api/` | Instância central do `apiClient` (Axios) com interceptor do Firebase JWT | `api.client.ts` |
| `components/ui/` | Biblioteca atômica do shadcn/ui | — |
| `errors/` | Type Guards pra parsear erros RFC 7807 | `app.errors.ts` |
| `logger/` | Serviço de observabilidade | `app.logger.ts` |
| `lib/` | Inicializadores de SDKs terceiros | `firebase.ts`, `signalr.ts` |
| `hooks/` | Hooks genéricos sem regra de negócio | `useDebouncedValue.ts` |

---

## 🚀 Defesas Técnicas

**1. Injeção Transparente de Tokens** — o cliente HTTP intercepta requisições assincronamente; o SDK do Firebase garante rotação automática do JWT em background sem deslogar o usuário à toa.

**2. Defesa de Performance no DOM** — proibido usar `index` como key em iterações de lista JSX. Chaves estáveis (`item.id`) evitam remontagens custosas do Virtual DOM durante atualizações de telemetria em tempo real.

**3. Validação Progressiva** — formulários usam `mode: "onSubmit"` (não incomoda durante a digitação inicial); após o primeiro erro, muda para `reValidateMode: "onChange"` pra ajudar na correção em tempo real.

**4. Isolamento de Erros Sem `any`** — exceções passam por `instanceof Error` + Type Guards antes de virar mensagem de UI, sem vazar stack trace técnico pro usuário final.

---

## 🏆 Qualidade, Padronização e Tooling

**Linter & Formatter — Biome.** Substitui Babel/ESLint/Prettier com velocidade maior e zero configuração adicional (`npm run lint` / `npm run format`).

**Lint de tokens de design — `npm run lint:tokens`.** Script custom (`scripts/lint-tokens.mjs`, roda automaticamente como parte de `npm run lint`) que varre `src/**/*.{ts,tsx}` e falha (`exit 1`) ao encontrar hex cru (`#fff`, `#09090b`, etc.) ou classes Tailwind de cor bruta com equivalente semântico (`bg-zinc-*`, `text-zinc-*`, `border-zinc-*`, `bg-indigo-*`, `text-indigo-*`, `bg-slate-*`, `text-slate-*`, `bg-red-*`, `text-red-*`, `border-red-*`) fora de `src/app/styles/` (único lugar legítimo pra hex cru, arquivos de tema). Existe pra impedir regressão do tipo já corrigido em Login/Registro/Configurações. Exceção legítima (ex: cor de marca de terceiro): comentário `// design-token-lint-ignore` na mesma linha ou linha anterior — ver `GoogleAuthButton.tsx`.

**Nomenclatura de arquivos:**

| Sufixo/Prefixo | Tipo | Exemplo real |
|---|---|---|
| `.api.ts` | Camada de requisições HTTP | `automations.api.ts` |
| `-ui.store.ts` | Estado de cliente Zustand (padrão predominante) | `history-ui.store.ts` |
| `useXxxStore.ts` | Store de domínio compartilhado entre features (exceção: `auth`) | `useAuthStore.ts` |
| `.types.ts` | Interfaces e schemas Zod | `automation-wizard.types.ts` |
| `.keys.ts` | Factory de query keys do TanStack Query | `history.keys.ts` |
| `.constants.ts` | Mapas estáticos (ícone, cor, label) | `history.constants.ts` |
| `useXxx.ts` (dentro de `hooks/`) | Hooks de orquestração — prefixo, não sufixo | `useEventHistory.ts` |
| `.spec.tsx` / `.spec.ts` (dentro de `__tests__/`) | Testes de unidade/componente (Vitest) | `HistoryView.spec.tsx` |
| `.tsx` | Componentes visuais | `HistoryTimeline.tsx` |

## 🧪 Rodando os Testes

```bash
npm run test:run       # Vitest — unidade e componentes
npm run test:e2e       # Playwright — fluxos end-to-end
```

Para subir o dev server localmente, veja a seção **Como Rodar** do [README raiz](../README.md).