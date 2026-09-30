# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

Frontend do Nexus Hub (Smart Home Hub IoT): SPA React 19 + TypeScript + Vite 8, Feature-Sliced Design, Tailwind 4 + shadcn (`components.json`, style `radix-nova`). Consome a API do `backend/` via REST (Axios) + SignalR, autentica via Firebase client SDK, i18n com i18next (pt-BR/en-US). Estado servidor: TanStack Query 5. Estado cliente: Zustand 5.

Camadas (`app/ → pages/ → widgets/ → features/ → core/`, dependência flui de cima pra baixo): `app/` orquestra providers/router; `pages/` são contêineres de rota finos; `widgets/` (`layout/`, `dashboard/`, `home/`, `legal-footer/`) é o único lugar onde é permitido cruzar domínios; `features/` são fatias verticais (`auth`, `dashboard`, `devices`, `rooms`, `device-groups`, `automations`, `history`, `integrations`, `settings`, `weather`, `dev`); `core/` é genérico, proibido importar de camada acima.

Irmão: `backend/` (.NET 10, `http://localhost:5252` em dev, `nexushub.page` em produção atrás de Cloudflare Tunnel). Em dev, Vite sobe em `http://localhost:5173`.

## Comandos

```bash
npm install
npm run dev                    # http://localhost:5173

npm run build                  # tsc -b && vite build
npx tsc -b                     # só typecheck (confirmado limpo nesta sessão)

npm run lint                   # biome check . && lint:tokens (valida uso de design tokens)
npm run format                 # biome format --write .

npm run test                   # vitest watch
npm run test:run               # vitest run (CI)
npx vitest run <caminho/do/arquivo.spec.tsx>   # 1 arquivo (confirmado funcionando)
npm run test:coverage

npm run test:e2e               # Playwright headless, baseURL :5173, só Chromium, locale pt-BR fixo
npm run test:e2e:ui
npm run test:e2e:report

npm run generate:theme         # scripts/generate-theme.mjs
```

## Testes

Três camadas — metodologia completa em `frontend/docs/testing-strategy.md` e skill `legacy-code-workflow`; aqui só os fatos:

- **Unit (Vitest)**: lógica pura sem DOM (`__tests__/` ao lado do código, ex.: `src/features/dashboard/lib/__tests__/formatEnergy.spec.ts`).
- **Integração (Vitest + Testing Library + MSW)**: proibido mockar subcomponente/Axios/`fetch` — MSW intercepta na rede. `renderWithProviders` (`src/testing/test-utils.tsx`) já injeta `QueryClientProvider` (`retry:false`, `gcTime:0`), `I18nextProvider`, `ConfirmDialogProvider`; `MemoryRouter` não vem por padrão. `server.resetHandlers()`+`cleanup()` a cada teste (`src/testing/setup-tests.ts`), `onUnhandledRequest: "error"`. Polyfills jsdom já configurados lá: `ResizeObserver`, `scrollIntoView`, `hasPointerCapture`/`releasePointerCapture` (Radix), `matchMedia` (sonner) — travou por API ausente do browser, começar por esse arquivo.
- **E2E (Playwright)**: `e2e/*.spec.ts` na raiz do frontend, fluxos críticos ponta a ponta contra build real.

## Pipeline / Deploy

**Sem CI configurado** — não existe `.github/` no repo (mesmo estado do backend).

Deploy: **Vercel** (`vercel.json`, rewrite `/(.*) → /index.html`, SPA puro). Config via `VITE_API_URL` (aponta pro backend, `.env.local`/`.env.example`) e chaves Firebase (`VITE_FIREBASE_*`).

## Arquitetura

**Boot**: `main.tsx` importa `core/i18n` e `core/utils/touchSafety` antes de montar, envolve `<App>` em `QueryClientProvider` (`core/lib/react-query.ts` — `staleTime: 5min`, `retry: 2`, `refetchOnWindowFocus: false`, erro de query logado via `Logger`/`query.meta.errorMessage`). `App.tsx` chama `useAuthListener()` + `useRealtimeListener()` no topo (hooks de efeito puro, sem JSX próprio), envolve `<Router>` em `ConfirmDialogProvider` + `<Toaster>` (sonner, tema dark).

**Routing** (`app/Router.tsx`): `createBrowserRouter`, páginas de auth (login/register/forgot-password/reset-password/verify-email) e `AuthLayout` carregadas eager (leves, todo visitante não-autenticado precisa na hora); páginas autenticadas via `lazy()`, com prefetch de todos os chunks em background feito pelo `AppLayout` após montar (elimina Suspense perceptível ao trocar de aba da sidebar). `ProtectedRoute`/`PublicRoute` (`features/auth/guards/`) fazem o gate.

**Navegação — não usar `<Link>` nos itens de nav**: bug conhecido do `react-router-dom` v7.18.3 (`<Link>` congela a aba 15-25s em cliques físicos rápidos e repetidos — `scheduling` de `React.startTransition`, não é bug do projeto, v8 não resolve). `Sidebar.tsx` e o menu mobile usam `<button onClick={() => navigate(path)}>`; `Router.tsx` usa `<RouterProvider useTransitions={false}>` como mitigação complementar. Decisão deliberada — não reverter pra `<Link>` sem confirmar fix upstream (`frontend/docs/architecture.md` §4.3).

**API client** (`core/api/api.client.ts`): Axios com `baseURL = VITE_API_URL`, timeout 10s. Interceptor de request injeta `Authorization: Bearer <token>` via `auth.currentUser.getIdToken()` (Firebase). Interceptor de response faz `signOut()` + limpa `useAuthStore` + redireciona (`setUnauthorizedRedirectHandler`) em qualquer `401`. Erros de `ProblemDetails` são parseados por `handleApplicationError` (`core/errors/app.errors.ts`) em `AppError`.

**Auth**: sessão (`user`, `isLoading`) vive em `core/hooks/useAuthStore.ts` — não em `features/auth/`, porque é lida fora da feature (ex.: `useRealtimeListener` precisa saber se há usuário logado antes de abrir a conexão SignalR). `features/auth/store/useAuthStore.ts` é um **re-export** do mesmo binding, não uma store separada — `features/auth` continua dona de toda escrita (login/logout, `AuthStateListener`). Consumo cross-feature read-only deveria preferir `core/hooks/useCurrentUser.ts`.

**SignalR** (`app/hooks/useRealtimeListener.ts`, hub `/hubs/telemetry`): único dono do ciclo de vida da conexão (`createSignalRConnection`/`setActiveHubConnection`, `core/lib/signalr.ts`) — outros hooks (`useThrottledHubInvoke`, usado no preview de slider) reaproveitam a mesma conexão via `getActiveHubConnection`, nunca abrem uma segunda. Eventos tratados: `DeviceStatusChanged`, `DeviceMediaChanged`, `SpotifyPlaybackChanged`, `ReceiveTelemetryUpdate` (debounce 800ms — chega em rajada), `AutomationExecutionResult`, `DeviceControlPreview`/`GroupControlPreview` (eco de arraste de slider de outro cliente conectado, só espelha, nunca invalida query). Reconexão (`onreconnected`) força refetch das queries relevantes — evento perdido durante queda nunca é reenviado pelo backend. Status de conexão + latência (`Ping` a cada 20s) em `useConnectionStatusStore`, com debounce de 1.5s antes de mostrar "Reconectando" (evita flicker em blip curto de rede).

**Server/Client state**: TanStack Query é o único que faz HTTP; Zustand só estado efêmero de UI (`[feature]-ui.store.ts`, exceção `auth` acima) — zero request dentro de uma store. Query Key Factory obrigatória (`[feature].keys.ts`, `as const`), proibido string solta em `queryKey`.

**Theming**: tokens em `src/app/styles/index.css` (`@theme inline`), 5 presets via `data-theme` (gerenciado por `features/settings/store/theme-ui.store.ts`). Regras completas de superfície/espaçamento/raio/tipografia: skill `design-system`.

**i18n**: `core/i18n/index.ts`, namespaces por feature em `core/i18n/locales/{pt-BR,en-US}/*.json`, `pt-BR` é o fallback.

## Armadilhas

- **`components.json` apontava pra `src/index.css`** (não existe — real é `src/app/styles/index.css`) — corrigido nesta sessão; se `npx shadcn add` continuar escrevendo no lugar errado, checar esse arquivo de novo.
- **Não usar `<Link>` do react-router-dom** em item de navegação — ver seção Arquitetura acima, bug real, mitigação deliberada.
- `ResponsiveContainer` (Recharts) atrás de elemento com `transition-[width]` (ex. sidebar) precisa de prop `debounce` alinhada à duração da transição, senão recalcula o gráfico a cada tick do `ResizeObserver` durante a animação (`frontend/docs/architecture.md` §4.2).
- `widgets/layout/Header.tsx` **não existe mais** — removido, cada página tem seu próprio header (ou nenhum ainda); `frontend/docs/responsive-design.md` tinha uma seção inteira sobre ele, removida nesta sessão por estar obsoleta — pendente reescrever quando o padrão por página estabilizar.
- Dois arquivos `useAuthStore.ts` (`core/hooks/` e `features/auth/store/`) não é duplicação — o segundo é re-export deliberado do primeiro.
- **Sem `.github/`** — não presumir CI/gate automático.

## Clean Code

Convenções gerais (FSD, esteira de 5 passos, `any` proibido, `erasableSyntaxOnly`, key de lista, Logger) já estão em `.claude/rules/frontend-fsd.md` (auto-anexada em qualquer arquivo do frontend que bata o glob) — regras de design system moram na skill, não aqui.

Reutilizar módulo como referência: feature `rooms/` é a mais recente e mais alinhada ao design system (`RoomListItem.tsx`, `RoomDetailPanel.tsx`, `RoomKpiCard.tsx`, `RoomDeviceCard.tsx`); `AppError` (`core/errors/app.errors.ts`) pra padrão de classe compatível com `erasableSyntaxOnly`; `history.keys.ts`/`automations.keys.ts` pra Query Key Factory.

## Skills deste repo

| Situação | Skill |
|---|---|
| Alterar código existente ou nova feature/fix | `legacy-code-workflow` |
| Criar/editar componente visual (cores, espaçamento, raio, tipografia, tema) | `design-system` |
| SignalR (hook de conexão, evento, throttle de preview) | `signalr-integration` |
