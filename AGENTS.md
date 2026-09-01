# 🏠 Smart Home Hub IoT — Diretrizes & Padrões do Projeto

> Este arquivo segue o padrão `AGENTS.md`, lido automaticamente pelo
> **Google Antigravity** (desde a versão 1.20.5) e por outras ferramentas
> agentic compatíveis (Claude Code, Cursor, Codex, etc.) — é a camada de
> contexto portátil entre ferramentas. Se quiser regras específicas só do
> Antigravity (não compartilhadas com outras ferramentas), elas vivem
> separadamente em `GEMINI.md` (raiz do projeto) ou em `.agent/rules/`
> (regras adicionais de workspace) — este arquivo aqui é o que deve
> funcionar igual em qualquer agente que o time usar.

Monorepo de Casa Inteligente de alta performance composto por Backend em C# (.NET 10) e Frontend em React 19 + TypeScript + Tailwind CSS.

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
- **Testes Unitários**: `npm run test` (watch) / `npm run test:run` (single run) / `npm run test:coverage` — Vitest. Specs ficam em `__tests__/` junto do código testado (ex: `src/features/dashboard/lib/__tests__/formatEnergy.spec.ts`).
- **Testes E2E**: `npm run test:e2e` (Playwright, headless) / `npm run test:e2e:ui` (modo interativo) / `npm run test:e2e:report`. Specs ficam em `e2e/*.spec.ts` na raiz do frontend (ex: `e2e/dashboard.spec.ts`, `e2e/devices.spec.ts`).

### Infraestrutura Local
- **Subir Containers**: `docker-compose up -d` (PostgreSQL + TimescaleDB + Mosquitto)

---

## 🏛️ Diretrizes Globais do Ecossistema

1. **Padrão de Tempo (UTC Absoluto)**: A API e o banco trafegam e salvam datas estritamente em **UTC** (`DateTimeOffset`). O backend nunca lida com fusos horários; a conversão para horário local (`Intl.DateTimeFormat`) ocorre exclusivamente na camada visual do frontend.
2. **Soft Delete Mandatório**: Entidades principais (`User`, `Room`, `Device`, `DeviceGroup`) implementam `ISoftDeletable` (`IsDeleted`, `DeletedAt`).
   - A aplicação **nunca dispara `DELETE` físico** — o `AppDbContext` intercepta e converte em atualização lógica.
   - **Atenção, agente**: o schema físico do EF Core **usa `DeleteBehavior.Cascade`/`.SetNull`/`.Restrict` extensivamente** nas relações — isso **não é proibido** e não deve ser removido ou "corrigido". Essas configurações funcionam como segunda camada de proteção para qualquer caminho que acesse o banco fora do `AppDbContext` interceptado (migrations, scripts administrativos). O que É esperado, e deve continuar sendo feito manualmente no Handler antes do soft-delete disparar, é a **desvinculação de FKs opcionais em memória** quando o pai é removido logicamente (ex: `DeleteRoomCommandHandler` zera `device.RoomId` num loop antes de remover o `Room`) — já que o soft-delete nunca aciona a constraint física do banco.
   - Índices parciais de unicidade (ex: `ExternalId`) devem conter `.HasFilter("\"IsDeleted\" = false")`.
3. **Commits em Inglês**: Mensagens de commit (título e corpo) são sempre em **inglês**, padrão Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `test`, `docs`), independente do idioma usado na conversa com o usuário.
4. **Commits Separados por Lógica e Contexto**: Nunca agrupar num único commit mudanças que pertencem a preocupações diferentes (ex: CRUD de escrita vs. endpoints de leitura vs. testes de integração vs. uma correção não relacionada encontrada de passagem). Cada commit deve contar uma história coesa e revisável isoladamente — quando em dúvida, prefira mais commits menores a um grande.

---

## ⚙️ Backend — Arquitetura Limpa & CQRS (C# / .NET 10)

### 1. Estrutura de Camadas
- `SmartHomeHub.Domain`: Entidades puras, Enums, primitivos `Result` e `Error` (zero dependências externas).
- `SmartHomeHub.Application`: Casos de uso divididos por features em CQRS.
- `SmartHomeHub.Infrastructure`: EF Core (`AppDbContext`), configurações de entidades, migrações, MQTT e serviços de rede.
- `SmartHomeHub.Api`: Host ASP.NET Core, Minimal APIs, Serilog, Scalar OpenAPI e Workers.
- `SmartHomeHub.IntegrationTests`: Testes E2E com **Testcontainers** (um container Docker por coleção de testes + **Respawn** resetando as tabelas entre cada `[Fact]`) no padrão AAA.

### 2. Padrões de Código e CQRS
- **Biblioteca Mediator**: Utiliza o pacote `Mediator` com Source Generators em tempo de compilação (não usar o MediatR clássico baseado em Reflection).
- **Nomenclatura**:
  - Command: `[Verbo][Substantivo]Command` (ex: `SetDeviceStateCommand`)
  - Query: `[Verbo][Substantivo]Query` (ex: `GetEventHistoryQuery`)
  - Handler: `[NomeDoCommandOuQuery]Handler` — **no mesmo arquivo** do Command/Query e do Validator, não em arquivos separados.
- **Tratamento de Erros Híbrido**:
  - Falhas de negócio esperadas: `Result` / `Result<T>` via Result Pattern.
  - Falhas inesperadas/infraestrutura: Exceptions capturadas pelo `GlobalExceptionHandler`.
  - Ambos retornam `ProblemDetails` (RFC 7807) padronizado para o frontend (`400`, `403`, `404`, `409`, `422`, `500`).
- **Validação de Entrada (Strict In, Tolerant Out)**:
  - FluentValidation no pipeline behavior intercepta requests antes dos Handlers.
  - DTOs e Requests **não** utilizam `required` para permitir que o FluentValidation controle o erro `422/400` padronizado.
  - Entidades: propriedades de navegação usam `= null!`; escalares imutáveis podem usar `required`.
- **Paginação Obrigatória**:
  - Proibido retorno de listas infinitas. Toda listagem implementa `IPagedQuery` (`Page`, `PageSize`) e retorna `PagedResult<T>` ordenado obrigatoriamente com `.OrderBy()` no EF Core.
  - Exceção deliberada: queries de estatística agregada (ex: `GetEventHistoryStatsQuery`) somam/contam sobre todo o conjunto filtrado de propósito e não seguem `IPagedQuery`.
- **Logs Estruturados (Serilog)**:
  - Estritamente **proibida** interpolação de strings (`$"{Var}"`) nos logs. Sempre usar Message Templates (`"Processando {DeviceName}", name`).
- **Telemetria IoT**: `DeviceTelemetryLog` e `SystemEvent` seguem padrão *Append-Only* no TimescaleDB (não usam Soft Delete).
- **MQTT**: telemetria de entrada em `home/telemetry/{deviceId}`; comandos de saída em `casa/comandos/{device.ExternalId}` — **note a inconsistência de idioma real no código** (inglês vs. português) — só aplicável a hardware MQTT genérico (Sonoff/Tasmota). Dispositivos Tuya usam TCP/UDP direto (AES-GCM), não passam por esse tópico.

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

> Padrão **universal e obrigatório** para todo o frontend (não só telas novas) — validado e aplicado em auditorias de consistência sobre Automações, `AppLayout`/Header/Sidebar, Dashboard e Dispositivos. Tabela completa com exemplos de antes/depois em `frontend/docs/ui-and-design-system.md`. **Proibido criar token novo de cor/espaçamento/raio** — usar exclusivamente os já definidos em `index.css`/`@theme inline`.
>
> Os tokens de superfície não são cores brutas — são aliases semânticos sobre tokens do shadcn já existentes: `--color-surface-low: var(--muted)`, `--color-surface-container: var(--card)`, `--color-surface-high: var(--popover)`, `--color-surface-highest: var(--surface-highest)`.

- **Paleta Oficial (Zinc Dark Surface, definida em `index.css`, classe `.dark` — preset padrão)**: `--background: #09090b`, `--muted: #121215`, `--card: #18181b`, `--popover: #27272a`, `--surface-highest: #3f3f46`, `--border: #3f3f46`, `--border-subtle: #27272a`, `--primary: #fafafa`/`--primary-foreground: #18181b`, `--foreground: #fafafa`, `--muted-foreground: #a1a1aa`, `--warm: #d4d4d8`/`--warm-foreground: #18181b`, `--alert: #ef4444`/`--alert-foreground: #ffffff` — todos confirmados direto no `index.css` real.
  - Feature `rooms/` é a referência viva mais recente (`RoomListItem.tsx`, `RoomDetailPanel.tsx`, `RoomKpiCard.tsx`, `RoomDeviceCard.tsx`).
  - Glows/gradientes: sutis (`shadow-[0_0_8px_rgba(...,0.2)]`), nunca `0.3+` de opacidade. Superfícies (cards, pills, botões) podem levar leve `bg-gradient-to-b`/`to-br` entre dois tons próximos da mesma camada, nunca gradientes contrastantes. **Nunca usar um stop de gradiente em hex arbitrário sem token equivalente** — achatar pra cor sólida do token mais próximo, ou `hover:brightness-110`/`95` quando precisar clarear/escurecer além do tom já definido na escada.

- **Sistema de Temas Alternativos (`data-theme`)**: o `.dark` é só o preset padrão ("zinc-minimalist"). Existem 4 presets adicionais selecionáveis via atributo `data-theme` no elemento com classe `.dark` (provavelmente gerenciados pelo `theme-ui.store.ts` da feature `settings`, exibidos no `ThemePresetSelector`):
  | Preset | `data-theme` | Cor primária |
  |---|---|---|
  | Zinc (padrão) | *(nenhum atributo)* | `#fafafa` (neutro) |
  | Indigo | `indigo` | `#5e6ad2` |
  | Slate Cyan | `slate-cyan` | `#06b6d4` |
  | GitHub Dimmed | `github-dimmed` | `#2f81f7` |
  | Contrast Safe Graphite | `contrast-safe-graphite` | `#5e6ad2` |

  **Regra ao criar/editar qualquer preset**: cada um redefine o conjunto completo de variáveis (`background` até `sidebar-ring`, `warm`, `alert`) — nunca redefina só uma variável isolada num novo preset, ou a escada de contraste quebra silenciosamente para quem usa esse tema. O preset `contrast-safe-graphite` é a referência de rigor: usa cinza neutro puro nas superfícies (zero tingimento de cor) especificamente para manter razões de contraste WCAG verificadas matematicamente (`background→card` 1.96:1, `muted-foreground` vs `card` 8.82:1, etc., documentado em comentário no próprio `index.css`) — ao criar um preset novo, não adicione tingimento de cor às superfícies sem recalcular esses pares de contraste.
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
- **Contraste de superfície (elevação)**: container pai sempre numa superfície mais escura que o filho direto, seguindo `background`/`muted` (surface-low) → `popover` (surface-container) → `card` (surface-high) → `surface-highest`, nunca o inverso. Um Dialog/modal já nasce em `bg-popover` (surface-container) — cards internos dele devem ser `bg-surface-high`, não `bg-surface-container` de novo (mesmo nível do próprio modal).
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
  - KPIs (faixas de resumo/métricas): `flex flex-col gap-1`, label acima `text-xs uppercase text-muted-foreground` (com `truncate`/`min-w-0` se o rótulo for longo, pra não quebrar linha e desalinhar a grade), valor abaixo em destaque `text-2xl font-semibold` usando cor de destaque do design system (`text-primary`, `text-warm`, `text-cool`, `text-alert-foreground`) — nunca uma cor nova. **KPIs agregados devem vir de uma query dedicada de estatística no backend, nunca ser derivados só da página atual de uma lista paginada** (bug já corrigido uma vez neste projeto — ver `GetEventHistoryStatsQuery`).
- **Scroll**:
  - Listas/painéis internos com rolagem própria usam a utilidade `.scrollbar-thin` (definida em `animations.css`) em vez da scrollbar padrão do navegador.
  - Modais/wizards cujo conteúdo pode cortar ao rolar ganham um indicador de fade-out: `<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-<superfície-ambiente> to-transparent" />` dentro de um wrapper `relative`, com o tom de origem igual ao `bg-*` do próprio container (`from-surface-low` num painel, `from-popover` dentro de um Dialog, etc.) — nunca uma cor fixa diferente da superfície real.
- **Transições e Acessibilidade**:
  - Respeitar a diretiva `prefers-reduced-motion`.
  - Manter Skeletons e estados de loading (`Loader2`) proporcionais ao layout final durante requisições assíncronas.