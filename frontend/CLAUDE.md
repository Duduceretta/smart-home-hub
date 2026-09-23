## ⚛️ Frontend — Feature-Sliced Design (React 19 / TypeScript)

### Comandos
- **Testes Unitários**: `npm run test` (watch) / `npm run test:run` (single run) / `npm run test:coverage` — Vitest. Specs ficam em `__tests__/` junto do código testado (ex: `src/features/dashboard/lib/__tests__/formatEnergy.spec.ts`).
- **Testes E2E**: `npm run test:e2e` (Playwright, headless) / `npm run test:e2e:ui` (modo interativo) / `npm run test:e2e:report`. Specs ficam em `e2e/*.spec.ts` na raiz do frontend (ex: `e2e/dashboard.spec.ts`, `e2e/devices.spec.ts`).

### 1. Estrutura FSD Estrita
```
src/
├── app/        # Providers globais, Router, estilos base (sem regra de negócio)
├── pages/      # Contêineres de rota puros (sem JSX complexo ou lógica de negócio)
├── widgets/    # Componentes de integração multi-feature (hoje: widgets/layout/ com AppLayout, AuthLayout, Header, Sidebar)
├── features/   # Fatias verticais de domínio: auth, dashboard, devices, rooms, device-groups, automations, history, integrations, settings, dev
└── core/       # Código genérico/compartilhado (apiClient, UI atômica, hooks puros, logger, errors)
```

> **Regra de Ouro**: Features **nunca** importam componentes ou hooks entre si diretamente. A comunicação entre domínios é feita via Zustand store ou pela camada de `widgets/`.

### 2. Esteira Unidirecional de Implementação de Features
Toda nova feature deve seguir estritamente os 5 passos:
1. `types/`: Interfaces que espelham os DTOs em camelCase do C# + Schemas Zod espelhando o FluentValidation.
2. `api/`: Funções assíncronas puras com `apiClient` (Axios) tipadas e com tratamento via `handleApplicationError` (proibido importar hooks aqui).
3. `hooks/`: Query Key Factory (`[feature].keys.ts` com `as const`) + Hooks TanStack Query (`useQuery` / `useMutation`), nomeados com prefixo `use` (ex: `useEventHistory.ts` — não sufixo `.hooks.ts`).
4. `store/`: Store Zustand (`[feature]-ui.store.ts`) para estado de UI efêmero (modais, busca, abas). Exceção histórica: `auth` usa `useAuthStore.ts`.
5. `components/` & `pages/`: Componentes visuais com formulários (RHF + Zod), Skeletons e modais/Sheets laterais.

### 3. Gerenciamento de Estado
- **Server State (TanStack Query v5)**: Único responsável por chamadas HTTP, cache, polling e Optimistic UI com rollback em erros.
- **Client State (Zustand)**: Apenas estado efêmero e síncrono da UI. **Zero requisições HTTP dentro do Zustand**.
- **SignalR** (`/hubs/telemetry`, hook único `useRealtimeListener.ts`): eventos reais hoje são `DeviceStatusChanged`, `DeviceMediaChanged`, `SpotifyPlaybackChanged`, `ReceiveTelemetryUpdate` (debounce de 800ms — dispara em rajada) e `AutomationExecutionResult`. Não existe um evento genérico de "novo SystemEvent"; features que precisam reagir a mudanças de histórico devem tratar esses sinais como gatilho para um refetch, não fabricar o dado a partir do payload.

### 4. Boas Práticas de Código TypeScript & Biome
- **Proibição do `any`**: Tipagem estrita com interfaces ou `unknown` + Type Guards.
- **Compatibilidade com `erasableSyntaxOnly` (Vite)**:
  - Declarar propriedades de classes explicitamente no corpo antes do construtor (sem modificadores `public readonly` direto nos parâmetros do construtor) — ver `AppError` em `core/errors/app.errors.ts` como referência real.
  - Usar Optional Chaining (`data?.property`) em vez de checagens redundantes.
- **Formulários**:
  - React Hook Form com `mode: "onSubmit"` e `reValidateMode: "onChange"`.
  - Tag obrigatória `<form noValidate>`.
  - Prevenção de Layout Shift (CLS): reservar `min-h-[18px]` para áreas de mensagens de erro.
- **Renderização e Listas**:
  - Sempre usar identificadores reais e únicos (`key={item.id}`) em `.map()` — **proibido usar `index` como key**.
- **Observabilidade**: Proibido `console.log`/`console.error`. Usar a fachada `Logger` (importado de `core/logger/app.logger.ts` como `import { Logger } from "@/core/logger/app.logger"`).

---

## 🎨 UI/UX & Design System (Dark Mode First)

> Padrão **universal e obrigatório** para todo o frontend (não só telas novas) — validado e aplicado em auditorias de consistência sobre Automações, `AppLayout`/Header/Sidebar, Dashboard e Dispositivos. Tabela completa com exemplos de antes/depois em `frontend/docs/ui-and-design-system.md`. **Proibido criar token novo de cor/espaçamento/raio** — usar exclusivamente os já definidos em `index.css`/`@theme inline` — exceção aprovada em 2026-09-23: `success`, `warning`, `info` (+ `-foreground`), ver `docs/theme-proposal.md` §0. Qualquer outro token novo continua exigindo aprovação explícita.
>
> Os tokens de superfície não são cores brutas — são aliases semânticos sobre tokens do shadcn já existentes: `--color-surface-low: var(--muted)`, `--color-surface-container: var(--card)`, `--color-surface-high: var(--popover)`, `--color-surface-highest: var(--surface-highest)`.

- **Paleta Oficial**: valores em `index.css` (classe `.dark` = preset padrão zinc-minimalist, mais os 4 `[data-theme]`), verificados por `npm run check:theme` (`scripts/theme-contrast-check.mjs`, roda dentro de `npm run lint`). Não copiar hex para docs — ficam desatualizados; a derivação (OKLCH) e as razões medidas estão em `docs/theme-proposal.md`.
  - Feature `rooms/` é a referência viva mais recente (`RoomListItem.tsx`, `RoomDetailPanel.tsx`, `RoomKpiCard.tsx`, `RoomDeviceCard.tsx`).
  - Glows/gradientes: sutis (`shadow-[0_0_8px_rgba(...,0.2)]`), nunca `0.3+` de opacidade. Superfícies (cards, pills, botões) podem levar leve `bg-gradient-to-b`/`to-br` entre dois tons próximos da mesma camada, nunca gradientes contrastantes. **Nunca usar um stop de gradiente em hex arbitrário sem token equivalente** — achatar pra cor sólida do token mais próximo, ou `hover:brightness-110`/`95` quando precisar clarear/escurecer além do tom já definido na escada.

- **Sistema de Temas Alternativos (`data-theme`)**: o `.dark` é só o preset padrão ("zinc-minimalist"). Existem 4 presets adicionais selecionáveis via atributo `data-theme` no elemento com classe `.dark` (provavelmente gerenciados pelo `theme-ui.store.ts` da feature `settings`, exibidos no `ThemePresetSelector`):
  | Preset | `data-theme` | Cor primária | Neutros (H/C OKLCH) |
  |---|---|---|---|
  | Zinc (padrão) | *(nenhum atributo)* | `#37c695` (teal) | 200° / 0.005 |
  | Indigo | `indigo` | `#aca2ff` | 277° / 0.02 |
  | Slate Cyan | `slate-cyan` | `#3fbfcc` | 255° / 0.026 |
  | GitHub Dimmed | `github-dimmed` | `#9dceff` | 256° / 0.016 |
  | Contrast Safe Graphite | `contrast-safe-graphite` | `#f4b0ed` (orquídea) | — / 0 (neutro) |

  **Regra ao criar/editar qualquer preset**: cada um redefine o conjunto completo de variáveis (todos os tokens de `REQUIRED` em `scripts/theme-contrast-check.mjs`, incluindo `success` / `warning` / `info`, `destructive-foreground` e `brand-*`) — nunca redefina só uma variável isolada num novo preset, ou a escada de contraste quebra silenciosamente para quem usa esse tema. Nenhum preset é mesclado sem `npm run check:theme` com 0 falhas. O preset `contrast-safe-graphite` é a referência de rigor: superfícies em cinza neutro puro (C = 0) e alvos maiores que os demais (texto ≥ 5.5:1, UI ≥ 3.6:1) — os números medidos estão no comentário do próprio `index.css`.
- **Espaçamento (grid de 4px)** — todo padding/gap deve cair em uma destas 5 paradas; eliminar valores "quebrados" (`p-3`, `p-5`, `gap-1.5`, `py-1.5`, `mb-5`) sem justificativa específica:
  | Tamanho | Classes | Uso |
  |---|---|---|
  | 4px | `p-1` / `gap-1` | ícone ⇄ texto em elementos pequenos (badges, botões compactos) |
  | 8px | `p-2` / `gap-2` | padding interno de pills de filtro; espaço entre itens de lista compacta |
  | 16px | `p-4` / `gap-4` | padding padrão de cards, inputs de formulário, seções de modal |
  | 24px | `p-6` / `gap-6` | padding de containers principais (painel de detalhe, corpo do modal); espaço entre seções distintas |
  | 32px | `p-8` / `gap-8` | margem externa entre o limite da tela e o início do conteúdo principal |

  Exceções sancionadas (não são "quebradas"): Label ⇄ Input `gap-1.5`/`space-y-1.5`; campos da mesma seção de formulário `space-y-3` a `space-y-4`; Input ⇄ mensagem de erro `mt-1`.
- **Raio aninhado**: o container externo usa sempre um raio maior que o do elemento filho — nunca o mesmo raio (fica "torto") nem um filho com raio maior que o pai. Ex.: painel/lista externa `rounded-xl` → cards/blocos internos `rounded-lg` → badges/pills internos `rounded-full`. Multiplicadores reais sobre `--radius` (0.75rem base): sm=0.6×, md=0.8×, lg=1×, xl=1.4×, 2xl=1.8×, 3xl=2.2×, 4xl=2.6×. Usar somente essa escada, nunca `rounded` bare nem valores arbitrários.
- **Contraste de superfície (elevação)**: escada `background` (página) → `muted` (surface-low, poço/recuo) → `card` (surface-container, **tile**) → `popover` (surface-high, elemento interno do tile, menu, dialog) → `surface-highest` (= `accent`, hover/selecionado dentro de popover). O filho sobe sempre pelo menos um degrau em relação ao pai. Um Dialog nasce em `bg-popover`, então cards internos dele usam `bg-surface-highest`, nunca `bg-card` (mais escuro que o próprio Dialog) nem `bg-popover` (mesmo nível). Tile × página: ΔL OKLCH ≥ 0.08 (garantido pela escada e checado por `npm run check:theme`); `border-subtle` é reforço, nunca o único separador. Poços (trilho de switch/progresso, skeleton, poço de ícone categórico) usam `bg-muted`.
- **Status × categoria**: `success` / `warning` / `info` / `alert` só comunicam estado real, e **sempre com ícone ou texto junto** (sob deuteranopia/protanopia a distância entre status fica em ΔE00 7–8, abaixo do limiar de distinção só por cor). Receita de badge: `bg-x/15 text-x border border-x/30`. Texto/ícone de alerta = `text-alert`; `alert-foreground`/`destructive-foreground` só sobre o sólido (`bg-alert`/`bg-destructive`). Categorias (tipo de dispositivo, cena, série de energia, categoria de atividade) usam `chart-1..5` conforme a tabela de famílias em `docs/theme-proposal.md` §7 — status nunca é categoria, e `primary` nunca é categoria. Ícone categórico fica num poço `bg-muted` (os `chart-*` têm ≥ 3:1 garantido só contra superfícies ≤ `card`).
- **`accent` é hover, não marca**: `bg-accent` só em hover/foco de ghost/menu. Cor de marca = `brand-accent`.
- **60/30/10**: neutros dominam; `primary` só em ação primária, item ativo/selecionado/ligado e foco. Ícones de cabeçalho de card e glows ficam neutros.
- **Daltonismo**: séries de dados usam `chart-1..5` na ordem de luminosidade (chart-1 escuro → chart-5 claro) e nunca dependem só de matiz. Legendas sempre com rótulo; linhas com marcador ou traço distinto quando houver ≥ 3 séries.
- **Estados**: hover/active por opacidade (`/90`, `/80`) ou `color-mix(in oklch, …)`, disabled por opacidade (`disabled:opacity-50`), seleção com `aria-pressed` + receita `border-primary/40 bg-primary/15 text-primary font-semibold`, e foco `focus-visible:ring-2 focus-visible:ring-ring` em todo controle.
- **Escala tipográfica**:
  | Papel | Classes |
  |---|---|
  | Título principal da tela | `text-2xl` a `text-3xl`, `font-semibold` |
  | Título de card/seção | `text-lg` a `text-xl`, `font-medium` |
  | Corpo de texto (descrições, resumos) | `text-sm`, `font-normal`, `text-muted-foreground` |
  | Labels/micro (status, cabeçalhos de bloco tipo "GATILHO") | `text-xs`, `font-medium`, `uppercase`, `tracking-wider` |

  Nunca usar tamanho arbitrário (`text-[10px]`, `text-[11px]`) — o piso da escala é `text-xs`. Valores KPI em destaque (`text-2xl`) usam `font-semibold`, nunca `font-bold`.
- **Componentização estrita**:
  - Pills de filtro: `h-8` fixo, `px-3` ou `px-4`, `text-sm`, `transition-colors` no hover — nunca altura variável via `py-*`.
  - Itens de lista (modo lista): `flex items-center justify-between`, `p-3` ou `p-4`, divisor via `divide-y` no container pai (não `border-b` por item — isso deixa borda sobrando no último item).
  - KPIs (faixas de resumo/métricas): `flex flex-col gap-1`, label acima `text-xs uppercase text-muted-foreground` (com `truncate`/`min-w-0` se o rótulo for longo, pra não quebrar linha e desalinhar a grade), valor abaixo em destaque `text-2xl font-semibold` usando cor de destaque do design system (`text-primary`, `text-success`, `text-warning`, `text-info`, `text-alert` — nunca `text-alert-foreground` fora de `bg-alert` sólido) — nunca uma cor nova. **KPIs agregados devem vir de uma query dedicada de estatística no backend, nunca ser derivados só da página atual de uma lista paginada** (bug já corrigido uma vez neste projeto — ver `GetEventHistoryStatsQuery`).
- **Scroll**:
  - Listas/painéis internos com rolagem própria usam a utilidade `.scrollbar-thin` (definida em `animations.css`) em vez da scrollbar padrão do navegador.
  - Modais/wizards cujo conteúdo pode cortar ao rolar ganham um indicador de fade-out: `<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-<superfície-ambiente> to-transparent" />` dentro de um wrapper `relative`, com o tom de origem igual ao `bg-*` do próprio container (`from-surface-low` num painel, `from-popover` dentro de um Dialog, etc.) — nunca uma cor fixa diferente da superfície real.
- **Transições e Acessibilidade**:
  - Respeitar a diretiva `prefers-reduced-motion`.
  - Manter Skeletons e estados de loading (`Loader2`) proporcionais ao layout final durante requisições assíncronas.
