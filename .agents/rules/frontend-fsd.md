---
description: "Convenções TypeScript, React e Feature-Sliced Design do frontend do Smart Home Hub"
globs: ["frontend/src/**/*.ts", "frontend/src/**/*.tsx"]
alwaysApply: false
---

# Convenções TypeScript / FSD (Smart Home Hub Frontend)

- **Camadas FSD**: `app/ → pages/ → widgets/ → features/ → core/`. Features nunca importam entre si diretamente — comunicação via Zustand store ou `widgets/`.
- **Esteira de 5 passos** em toda feature nova: `types/` → `api/` → `hooks/` (Query Key Factory `[feature].keys.ts` + hooks TanStack Query, prefixo `use`, nunca sufixo `.hooks.ts`) → `store/` (`[feature]-ui.store.ts`; exceção: `auth` usa `useAuthStore.ts`) → `components/`/`pages/`.
- **Server State vs Client State**: TanStack Query é o único responsável por HTTP/cache/polling. Zustand só estado efêmero de UI — zero requisição HTTP dentro de uma store.
- **Proibido `any`** — use interfaces ou `unknown` + Type Guards.
- **`erasableSyntaxOnly`**: propriedades de classe declaradas explicitamente no corpo, nunca `public readonly` direto no parâmetro do construtor (ver `AppError` em `core/errors/app.errors.ts`).
- **Listas**: `key={item.id}` sempre — nunca `index`.
- **Observabilidade**: nunca `console.log`/`console.error` — usar `Logger` de `@/core/logger/app.logger`.
- **Formulários**: `mode: "onSubmit"` + `reValidateMode: "onChange"`, `<form noValidate>`, erro reserva `min-h-[18px]`.
- **KPIs agregados**: sempre de uma query dedicada de estatística no backend, nunca derivados só da página atual de uma lista paginada (bug já corrigido uma vez — ver `GetEventHistoryStatsQuery`).
- **SignalR** (`useRealtimeListener.ts`): eventos reais são `DeviceStatusChanged`, `DeviceMediaChanged`, `SpotifyPlaybackChanged`, `ReceiveTelemetryUpdate` (debounce 800ms), `AutomationExecutionResult`. Não existe evento genérico de "novo SystemEvent" — trate como gatilho de refetch, não fabrique o dado do payload.