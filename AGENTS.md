# 🏠 Smart Home Hub IoT — Diretrizes & Padrões do Projeto

> Arquivo segue padrão `AGENTS.md`. **Google Antigravity** (versão 1.20.5+) lê sozinho. Outras ferramenta agentic também ler (Claude Code, Cursor, Codex, etc.) — é camada contexto portátil entre ferramentas. Regra só-Antigravity (não compartilhada) mora separado em `GEMINI.md` (raiz projeto) ou `.agent/rules/` (regra extra workspace) — este arquivo aqui deve funcionar igual em qualquer agente time usar.

Monorepo Casa Inteligente alta performance. Backend C# (.NET 10) + Frontend React 19 + TypeScript + Tailwind CSS.

---

## ⚡ Comandos Rápidos

### Backend (.NET 10)
- **Compilar**: `dotnet build`
- **Executar API**: `dotnet run --project src/SmartHomeHub.Api`
- **Rodar Testes**: `dotnet test`
- **Formatação de Código**: `dotnet csharpier .`

### Frontend (React 19 / Vite)
- **Desenvolvimento**: `npm run dev`
- **Checagem de Tipos / Build**: `npm run build`
- **Linter & Validação**: `npm run lint` (Biome)
- **Formatação**: `npm run format` (Biome)
- **Testes Unitários**: `npm run test` (watch) / `npm run test:run` (single run) / `npm run test:coverage` — Vitest. Specs ficar em `__tests__/` junto código testado (ex: `src/features/dashboard/lib/__tests__/formatEnergy.spec.ts`).
- **Testes E2E**: `npm run test:e2e` (Playwright, headless) / `npm run test:e2e:ui` (modo interativo) / `npm run test:e2e:report`. Specs ficar em `e2e/*.spec.ts` raiz frontend (ex: `e2e/dashboard.spec.ts`, `e2e/devices.spec.ts`).

### Infraestrutura Local
- **Subir Containers**: `docker-compose up -d` (PostgreSQL + TimescaleDB + Mosquitto)

---

## 🏛️ Diretrizes Globais do Ecossistema

1. **Padrão de Tempo (UTC Absoluto)**: API e banco só trafegar/salvar data em **UTC** (`DateTimeOffset`). Backend nunca mexer fuso horário; conversão horário local (`Intl.DateTimeFormat`) só acontecer camada visual frontend.
2. **Soft Delete Mandatório**: Entidade principal (`User`, `Room`, `Device`, `DeviceGroup`) implementar `ISoftDeletable` (`IsDeleted`, `DeletedAt`).
   - App **nunca disparar `DELETE` físico** — `AppDbContext` interceptar e virar atualização lógica.
   - **Atenção, agente**: schema físico EF Core **usar `DeleteBehavior.Cascade`/`.SetNull`/`.Restrict` bastante** nas relação — isso **não proibido**, não remover nem "corrigir". Configuração ser segunda camada proteção pra qualquer caminho acessar banco fora `AppDbContext` interceptado (migrations, script administrativo). Coisa esperada, fazer manual no Handler antes soft-delete disparar: **desvincular FK opcional em memória** quando pai remover logicamente (ex: `DeleteRoomCommandHandler` zerar `device.RoomId` num loop antes remover `Room`) — soft-delete nunca acionar constraint física banco.
   - Índice parcial unicidade (ex: `ExternalId`) precisar `.HasFilter("\"IsDeleted\" = false")`.
3. **Commits em Inglês**: Mensagem commit (título + corpo) sempre **inglês**, padrão Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `test`, `docs`), não importar idioma conversa com usuário.
4. **Commits Separados por Lógica e Contexto**: Nunca juntar num commit só mudança que pertencer preocupação diferente (ex: CRUD escrita vs. endpoint leitura vs. teste integração vs. correção não-relacionada achada de passagem). Cada commit contar história coesa revisável sozinho — em dúvida, preferir mais commit pequeno que um grande.

---

## ⚙️ Backend — Arquitetura Limpa & CQRS (C# / .NET 10)

### 1. Estrutura de Camadas
- `SmartHomeHub.Domain`: Entidade pura, Enum, primitivo `Result` e `Error` (zero dependência externa).
- `SmartHomeHub.Application`: Caso uso dividido por feature em CQRS.
- `SmartHomeHub.Infrastructure`: EF Core (`AppDbContext`), config entidade, migration, MQTT, serviço rede.
- `SmartHomeHub.Api`: Host ASP.NET Core, Minimal APIs, Serilog, Scalar OpenAPI, Workers.
- `SmartHomeHub.IntegrationTests`: Teste E2E com **Testcontainers** (um container Docker por coleção teste + **Respawn** resetar tabela entre cada `[Fact]`) padrão AAA.

### 2. Padrões de Código e CQRS
- **Biblioteca Mediator**: Usar pacote `Mediator` com Source Generators tempo compilação (não usar MediatR clássico baseado Reflection).
- **Nomenclatura**:
  - Command: `[Verbo][Substantivo]Command` (ex: `SetDeviceStateCommand`)
  - Query: `[Verbo][Substantivo]Query` (ex: `GetEventHistoryQuery`)
  - Handler: `[NomeDoCommandOuQuery]Handler` — **mesmo arquivo** Command/Query + Validator, não arquivo separado.
- **Tratamento de Erros Híbrido**:
  - Falha negócio esperada: `Result` / `Result<T>` via Result Pattern.
  - Falha inesperada/infra: Exception capturar `GlobalExceptionHandler`.
  - Ambos devolver `ProblemDetails` (RFC 7807) padrão pro frontend (`400`, `403`, `404`, `409`, `422`, `500`).
- **Validação de Entrada (Strict In, Tolerant Out)**:
  - FluentValidation no pipeline behavior interceptar request antes Handler.
  - DTO e Request **não** usar `required` — deixar FluentValidation controlar erro `422/400` padrão.
  - Entidade: propriedade navegação usar `= null!`; escalar imutável poder usar `required`.
- **Paginação Obrigatória**:
  - Proibido lista infinita. Toda listagem implementar `IPagedQuery` (`Page`, `PageSize`), devolver `PagedResult<T>` sempre ordenado com `.OrderBy()` no EF Core.
  - Exceção proposital: query estatística agregada (ex: `GetEventHistoryStatsQuery`) somar/contar conjunto filtrado inteiro de propósito, não seguir `IPagedQuery`.
- **Logs Estruturados (Serilog)**:
  - **Proibido** interpolação string (`$"{Var}"`) em log. Sempre usar Message Templates (`"Processando {DeviceName}", name`).
- **Telemetria IoT**: `DeviceTelemetryLog` e `SystemEvent` seguir padrão *Append-Only* no TimescaleDB (não usar Soft Delete).
- **MQTT**: telemetria entrada em `home/telemetry/{deviceId}`; comando saída em `casa/comandos/{device.ExternalId}` — **note inconsistência idioma real código** (inglês vs. português) — só valer hardware MQTT genérico (Sonoff/Tasmota). Dispositivo Tuya usar TCP/UDP direto (AES-GCM), não passar por esse tópico.

---

## ⚛️ Frontend — Feature-Sliced Design (React 19 / TypeScript)

### 1. Estrutura FSD Estrita
```
src/
├── app/        # Providers globais, Router, estilos base (sem regra de negócio)
├── pages/      # Contêineres de rota puros (sem JSX complexo ou lógica de negócio)
├── widgets/    # Componentes de integração multi-feature (hoje: widgets/layout/ com AppLayout, AuthLayout, Header, Sidebar)
├── features/   # Fatias verticais de domínio: auth, dashboard, devices, rooms, device-groups, automations, history, integrations, settings, dev
└── core/       # Código genérico/compartilhado (apiClient, UI atômica, hooks puros, logger, errors)
```

> **Regra de Ouro**: Feature **nunca** importar componente ou hook entre si direto. Comunicação entre domínio ser via Zustand store ou camada `widgets/`.

### 2. Esteira Unidirecional de Implementação de Features
Toda feature nova seguir estrito 5 passo:
1. `types/`: Interface espelhar DTO camelCase do C# + Schema Zod espelhar FluentValidation.
2. `api/`: Função assíncrona pura com `apiClient` (Axios) tipada, tratamento via `handleApplicationError` (proibido importar hook aqui).
3. `hooks/`: Query Key Factory (`[feature].keys.ts` com `as const`) + Hook TanStack Query (`useQuery` / `useMutation`), nome com prefixo `use` (ex: `useEventHistory.ts` — não sufixo `.hooks.ts`).
4. `store/`: Store Zustand (`[feature]-ui.store.ts`) pra estado UI efêmero (modal, busca, aba). Exceção histórica: `auth` usar `useAuthStore.ts`.
5. `components/` & `pages/`: Componente visual com formulário (RHF + Zod), Skeleton, modal/Sheets lateral.

### 3. Gerenciamento de Estado
- **Server State (TanStack Query v5)**: Único responsável chamada HTTP, cache, polling, Optimistic UI com rollback em erro.
- **Client State (Zustand)**: Só estado efêmero síncrono da UI. **Zero requisição HTTP dentro Zustand**.
- **SignalR** (`/hubs/telemetry`, hook único `useRealtimeListener.ts`): evento real hoje ser `DeviceStatusChanged`, `DeviceMediaChanged`, `SpotifyPlaybackChanged`, `ReceiveTelemetryUpdate` (debounce 800ms — disparar em rajada) e `AutomationExecutionResult`. Não existir evento genérico "novo SystemEvent"; feature precisar reagir mudança histórico deve tratar sinal como gatilho refetch, não fabricar dado a partir payload.

### 4. Boas Práticas de Código TypeScript & Biome
- **Proibição do `any`**: Tipagem estrita com interface ou `unknown` + Type Guards.
- **Compatibilidade com `erasableSyntaxOnly` (Vite)**:
  - Declarar propriedade classe explícito no corpo antes construtor (sem modificador `public readonly` direto no parâmetro construtor) — ver `AppError` em `core/errors/app.errors.ts` referência real.
  - Usar Optional Chaining (`data?.property`) em vez checagem redundante.
- **Formulários**:
  - React Hook Form com `mode: "onSubmit"` e `reValidateMode: "onChange"`.
  - Tag obrigatória `<form noValidate>`.
  - Prevenir Layout Shift (CLS): reservar `min-h-[18px]` pra área mensagem erro.
- **Renderização e Listas**:
  - Sempre usar identificador real único (`key={item.id}`) em `.map()` — **proibido usar `index` como key**.
- **Observabilidade**: Proibido `console.log`/`console.error`. Usar fachada `Logger` (importado de `core/logger/app.logger.ts` como `import { Logger } from "@/core/logger/app.logger"`).

---

## 🎨 UI/UX & Design System (Dark Mode First)

> Padrão **universal obrigatório** pra todo frontend (não só tela nova) — validado aplicado em auditoria consistência sobre Automações, `AppLayout`/Header/Sidebar, Dashboard, Dispositivos. Tabela completa com exemplo antes/depois em `frontend/docs/ui-and-design-system.md`. **Proibido criar token novo cor/espaçamento/raio** — usar só os já definido em `index.css`/`@theme inline`.
>
> Token superfície não ser cor bruta — ser alias semântico sobre token shadcn já existente: `--color-surface-low: var(--muted)`, `--color-surface-container: var(--card)`, `--color-surface-high: var(--popover)`, `--color-surface-highest: var(--surface-highest)`.

- **Paleta Oficial (Zinc Dark Surface, definida em `index.css`, classe `.dark` — preset padrão)**: `--background: #09090b`, `--muted: #121215`, `--card: #18181b`, `--popover: #27272a`, `--surface-highest: #3f3f46`, `--border: #3f3f46`, `--border-subtle: #27272a`, `--primary: #fafafa`/`--primary-foreground: #18181b`, `--foreground: #fafafa`, `--muted-foreground: #a1a1aa`, `--warm: #d4d4d8`/`--warm-foreground: #18181b`, `--alert: #ef4444`/`--alert-foreground: #ffffff` — tudo confirmado direto no `index.css` real.
  - Feature `rooms/` ser referência viva mais recente (`RoomListItem.tsx`, `RoomDetailPanel.tsx`, `RoomKpiCard.tsx`, `RoomDeviceCard.tsx`).
  - Glow/gradiente: sutil (`shadow-[0_0_8px_rgba(...,0.2)]`), nunca `0.3+` opacidade. Superfície (card, pill, botão) poder levar leve `bg-gradient-to-b`/`to-br` entre dois tom próximo mesma camada, nunca gradiente contrastante. **Nunca usar stop gradiente em hex arbitrário sem token equivalente** — achatar pra cor sólida do token mais próximo, ou `hover:brightness-110`/`95` quando precisar clarear/escurecer além tom já definido na escada.

- **Sistema de Temas Alternativos (`data-theme`)**: `.dark` ser só preset padrão ("zinc-minimalist"). Existir 4 preset extra selecionável via atributo `data-theme` no elemento classe `.dark` (provável gerenciado por `theme-ui.store.ts` da feature `settings`, mostrado no `ThemePresetSelector`):
  | Preset | `data-theme` | Cor primária |
  |---|---|---|
  | Zinc (padrão) | *(nenhum atributo)* | `#fafafa` (neutro) |
  | Indigo | `indigo` | `#5e6ad2` |
  | Slate Cyan | `slate-cyan` | `#06b6d4` |
  | GitHub Dimmed | `github-dimmed` | `#2f81f7` |
  | Contrast Safe Graphite | `contrast-safe-graphite` | `#5e6ad2` |

  **Regra ao criar/editar qualquer preset**: cada um redefinir conjunto completo variável (`background` até `sidebar-ring`, `warm`, `alert`) — nunca redefinir só uma variável isolada em preset novo, senão escada contraste quebrar silencioso pra quem usar esse tema. Preset `contrast-safe-graphite` ser referência de rigor: usar cinza neutro puro nas superfície (zero tingimento cor) especificamente pra manter razão contraste WCAG verificada matematicamente (`background→card` 1.96:1, `muted-foreground` vs `card` 8.82:1, etc., documentado em comentário no próprio `index.css`) — ao criar preset novo, não adicionar tingimento cor às superfície sem recalcular esses par contraste.
- **Espaçamento (grid de 4px)** — todo padding/gap deve cair numa destas 5 parada; eliminar valor "quebrado" (`p-3`, `p-5`, `gap-1.5`, `py-1.5`, `mb-5`) sem justificativa específica:
  | Tamanho | Classes | Uso |
  |---|---|---|
  | 4px | `p-1` / `gap-1` | ícone ⇄ texto em elemento pequeno (badge, botão compacto) |
  | 8px | `p-2` / `gap-2` | padding interno pill filtro; espaço entre item lista compacta |
  | 16px | `p-4` / `gap-4` | padding padrão card, input formulário, seção modal |
  | 24px | `p-6` / `gap-6` | padding container principal (painel detalhe, corpo modal); espaço entre seção distinta |
  | 32px | `p-8` / `gap-8` | margem externa entre limite tela e início conteúdo principal |

  Exceção sancionada (não ser "quebrada"): Label ⇄ Input `gap-1.5`/`space-y-1.5`; campo mesma seção formulário `space-y-3` a `space-y-4`; Input ⇄ mensagem erro `mt-1`.
- **Raio aninhado**: container externo sempre raio maior que elemento filho — nunca mesmo raio (fica "torto") nem filho com raio maior que pai. Ex.: painel/lista externa `rounded-xl` → card/bloco interno `rounded-lg` → badge/pill interno `rounded-full`. Multiplicador real sobre `--radius` (0.75rem base): sm=0.6×, md=0.8×, lg=1×, xl=1.4×, 2xl=1.8×, 3xl=2.2×, 4xl=2.6×. Usar só essa escada, nunca `rounded` bare nem valor arbitrário.
- **Contraste de superfície (elevação)**: container pai sempre superfície mais escura que filho direto, seguir `background`/`muted` (surface-low) → `popover` (surface-container) → `card` (surface-high) → `surface-highest`, nunca inverso. Dialog/modal já nascer em `bg-popover` (surface-container) — card interno dele dever ser `bg-surface-high`, não `bg-surface-container` de novo (mesmo nível do próprio modal).
- **Escala tipográfica**:
  | Papel | Classes |
  |---|---|
  | Título principal da tela | `text-2xl` a `text-3xl`, `font-semibold` |
  | Título de card/seção | `text-lg` a `text-xl`, `font-medium` |
  | Corpo de texto (descrições, resumos) | `text-sm`, `font-normal`, `text-muted-foreground` |
  | Labels/micro (status, cabeçalhos de bloco tipo "GATILHO") | `text-xs`, `font-medium`, `uppercase`, `tracking-wider` |

  Nunca usar tamanho arbitrário (`text-[10px]`, `text-[11px]`) — piso da escala ser `text-xs`. Valor KPI em destaque (`text-2xl`) usar `font-semibold`, nunca `font-bold`.
- **Componentização estrita**:
  - Pill filtro: `h-8` fixo, `px-3` ou `px-4`, `text-sm`, `transition-colors` no hover — nunca altura variável via `py-*`.
  - Item lista (modo lista): `flex items-center justify-between`, `p-3` ou `p-4`, divisor via `divide-y` no container pai (não `border-b` por item — isso deixar borda sobrando no último item).
  - KPI (faixa resumo/métrica): `flex flex-col gap-1`, label acima `text-xs uppercase text-muted-foreground` (com `truncate`/`min-w-0` se rótulo for longo, pra não quebrar linha e desalinhar grade), valor abaixo em destaque `text-2xl font-semibold` usando cor destaque design system (`text-primary`, `text-warm`, `text-cool`, `text-alert-foreground`) — nunca cor nova. **KPI agregado dever vir de query dedicada estatística no backend, nunca ser derivado só da página atual de lista paginada** (bug já corrigido uma vez nesse projeto — ver `GetEventHistoryStatsQuery`).
- **Scroll**:
  - Lista/painel interno com rolagem própria usar utilidade `.scrollbar-thin` (definida em `animations.css`) em vez scrollbar padrão navegador.
  - Modal/wizard cujo conteúdo poder cortar ao rolar ganhar indicador fade-out: `<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-<superfície-ambiente> to-transparent" />` dentro wrapper `relative`, com tom origem igual `bg-*` do próprio container (`from-surface-low` num painel, `from-popover` dentro Dialog, etc.) — nunca cor fixa diferente da superfície real.
- **Transições e Acessibilidade**:
  - Respeitar diretiva `prefers-reduced-motion`.
  - Manter Skeleton e estado loading (`Loader2`) proporcional ao layout final durante requisição assíncrona.