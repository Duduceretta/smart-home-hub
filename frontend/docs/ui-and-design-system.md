# 🎨 Diretrizes de UI, Espaçamento e Design System

> Estas diretrizes são **padrão universal do projeto**, não uma recomendação por feature. Nasceram de uma série de auditorias de consistência visual (Automações, `AppLayout`/Header/Sidebar, Dashboard, Dispositivos) que corrigiram desvios reais encontrados no código — ver seção 10 para exemplos de "antes → depois". **Nunca criar token novo de cor, espaçamento ou raio**: usar exclusivamente os já definidos em `src/app/styles/index.css`.
>
> Importante sobre a escada de superfícies: `--color-surface-low/container/high/highest` **não são cores novas** — são aliases semânticos, declarados em `@theme inline`, apontando para tokens do shadcn que já existiam (`--muted`, `--card`, `--popover`) mais um quarto nível novo (`--surface-highest`):
> ```css
> --color-surface-low: var(--muted);
> --color-surface-container: var(--card);
> --color-surface-high: var(--popover);
> --color-surface-highest: var(--surface-highest);
> ```
> Da mesma forma, `--color-warm`, `--color-alert` e `--color-cool` (este último é só um apelido pra `--primary`) são as cores de destaque semânticas do projeto. Use as classes Tailwind derivadas (`bg-surface-low`, `bg-card`, `bg-popover`, `text-muted-foreground`, `rounded-lg`, etc.) — nunca a variável CSS crua no componente.

## 1. Sistema de Temas Alternativos (`data-theme`)

O `.dark` em `index.css` define o preset padrão ("zinc-minimalist" — o único coberto pelas seções 2 a 10 deste documento). Além dele, existem 4 presets adicionais selecionáveis via atributo `data-theme` no elemento com classe `.dark`, provavelmente gerenciados pelo `theme-ui.store.ts` da feature `settings` e expostos no `ThemePresetSelector`:

| Preset | `data-theme` | Cor primária |
|---|---|---|
| Zinc (padrão) | *(nenhum atributo)* | `#fafafa` (neutro) |
| Indigo | `indigo` | `#5e6ad2` |
| Slate Cyan | `slate-cyan` | `#06b6d4` |
| GitHub Dimmed | `github-dimmed` | `#2f81f7` |
| Contrast Safe Graphite | `contrast-safe-graphite` | `#5e6ad2` |

**Regra ao criar ou editar qualquer preset:** cada bloco `.dark[data-theme="..."]` redefine o conjunto **completo** de variáveis (`background` até `sidebar-ring`, incluindo `warm` e `alert`) — nunca redefina só uma variável isolada num preset novo, ou a escada de contraste quebra silenciosamente pra quem usa esse tema.

O `contrast-safe-graphite` é a referência de rigor do grupo: usa cinza neutro puro nas superfícies (zero tingimento de cor) especificamente para manter razões de contraste WCAG verificadas matematicamente — documentado em comentário no próprio `index.css`:

- `background → card`: 1.96:1
- `background → popover`: 2.74:1
- `background → surface-highest`: 3.84:1 *(escada crescente de elevação)*
- `border-subtle` vs `card`: 3.00:1 *(≥3:1, WCAG 1.4.11 — bordas/componentes não-textuais)*
- `muted-foreground` vs `card`: 8.82:1 *(≥4.5:1, texto)*
- `primary-foreground` vs `primary`: 4.70:1; `destructive-foreground` vs `destructive`: 4.83:1 *(ambos ≥4.5:1, texto sobre botão)*

Ao criar um preset novo, **não adicione tingimento de cor às superfícies sem recalcular esses pares de contraste** — é fácil quebrar a acessibilidade escolhendo tons "por olho".

---

## 2. Ritmo Vertical e Agrupamento Proporcional (8px Grid)

Para garantir consistência visual e hierarquia clara entre formulários e painéis:

| Relação Visual | Espaçamento | Classes Tailwind |
|---|---|---|
| **Label ⇄ Input** | 4px a 6px | `gap-1.5` ou `space-y-1.5` |
| **Input ⇄ Mensagem de Erro** | 4px | `mt-1` |
| **Campos da mesma Seção** | 12px a 16px | `space-y-3` a `space-y-4` |
| **Entre Seções/Categorias** | 24px a 32px | `space-y-6` a `space-y-8` |

### 2.1. Prevenção de Layout Shift (CLS) em Erros de Validação
Mensagens de validação que surgem repentinamente causam pulos na interface (*Cumulative Layout Shift*).

- **Padrão:** Reserve a área da mensagem com `min-h-[18px]` ou `min-h-[20px]` na tag de erro em vez de renderizar condicionalmente containers de altura fixa desproporcionais.

---

## 3. Padrão de Modais e Sheets de Domínio

- Telas com cadastros de alta densidade (ex: `CreateRoomSheet`, `EditDeviceSheet`) utilizam componentes laterais do tipo **Sheet (Drawer lateral)** para não perder o contexto da tabela/dashboard ao fundo.
- **Carregamento Visual:** Listas e cards devem utilizar **Skeletons** proporcionais à estrutura final em vez de *spinners* soltos centralizados.

---

## 4. Escala de Espaçamento (Grid de 4px)

Todo `padding`/`gap` cai em uma destas 5 paradas. Eliminar valores "quebrados" (`p-3`, `p-5`, `gap-1.5`, `py-1.5`, `mb-5`, `px-2.5`) sem justificativa específica — as únicas exceções sancionadas estão na tabela da seção 2 (Label ⇄ Input, campos da mesma seção, input ⇄ erro).

| Tamanho | Classes | Uso |
|---|---|---|
| 4px | `p-1` / `gap-1` | ícone ⇄ texto em elementos pequenos (badges, botões compactos) |
| 8px | `p-2` / `gap-2` | padding interno de pills de filtro; espaçamento entre itens de lista compacta (modo lista) |
| 16px | `p-4` / `gap-4` | padding padrão de cards, inputs de formulário, seções de modal |
| 24px | `p-6` / `gap-6` | padding de containers principais (painel de detalhe, corpo do modal); espaço entre seções distintas |
| 32px | `p-8` / `gap-8` | margem externa entre o limite da tela e o início do conteúdo principal |

## 5. Raio Aninhado Consistente

Container pai sempre com raio **maior** que o do filho — nunca o mesmo raio (fica "torto" visualmente) nem um filho com raio maior que o pai. Escada válida (nunca `rounded` bare nem valores arbitrários), com o multiplicador real de cada parada sobre o `--radius` base (`0.75rem`):

`--radius-sm` (0.6×) → `--radius-md` (0.8×) → `--radius-lg` (1×, base) → `--radius-xl` (1.4×) → `--radius-2xl` (1.8×) → `--radius-3xl` (2.2×) → `--radius-4xl` (2.6×)

Exemplo de progressão correta: painel/lista externa `rounded-xl` → cards/blocos internos `rounded-lg` → badges/pills dentro do card `rounded-full`.

## 6. Contraste de Superfície (Elevação)

Container pai sempre numa superfície mais **escura**/baixa que o filho direto, seguindo esta escada (nunca o inverso):

`bg-background` / `bg-muted` (surface-low) → `bg-popover` (surface-container) → `bg-card` (surface-high) → `bg-surface-highest`

Atenção especial a Dialogs/modais: o `DialogContent` padrão já nasce em `bg-popover` (surface-container) — qualquer card/bloco dentro dele precisa subir pra `bg-surface-high` (ou mais), nunca repetir `bg-surface-container`, senão o filho fica no mesmo nível do próprio modal (chapado, sem profundidade).

Quando precisar de um efeito "mais claro que o tom mais claro definido" (ex.: hover num chip que já está em `surface-highest`), usar `hover:brightness-110`/`hover:brightness-95` em vez de inventar um hex mais claro/escuro.

## 7. Escala Tipográfica

| Papel | Classes |
|---|---|
| Título principal da tela (ex: "Automações") | `text-2xl` a `text-3xl`, `font-semibold` |
| Título de card/seção (nome da entidade, títulos de bloco) | `text-lg` a `text-xl`, `font-medium` |
| Corpo de texto (descrições, resumos) | `text-sm`, `font-normal`, `text-muted-foreground` |
| Labels/micro (status "ATIVA", cabeçalhos tipo "GATILHO"/"AÇÕES") | `text-xs`, `font-medium`, `uppercase`, `tracking-wider` |

- Nunca usar tamanho arbitrário (`text-[9px]`, `text-[10px]`, `text-[11px]`) — o piso da escala é `text-xs`.
- Valores numéricos em destaque (KPIs, contadores grandes) usam `text-2xl font-semibold` — nunca `font-bold`.
- Labels/micro em uppercase usam `font-medium` — nunca `font-semibold`/`font-bold` (isso é reservado para título principal e KPIs).

## 8. Componentização Estrita

- **Pills de filtro**: `h-8` fixo (nunca altura variável via `py-*`), `px-3` ou `px-4`, `text-sm`, `transition-colors` no hover.
- **Itens de lista (modo lista/linha)**: `flex items-center justify-between`, `p-3` ou `p-4`; divisor via `divide-y` no container pai — não `border-b` por item (deixa borda sobrando depois do último item).
- **KPIs** (faixas de resumo/métricas no topo de uma tela): `flex flex-col gap-1`; label acima em `text-xs uppercase text-muted-foreground` (com `min-w-0 flex-1 truncate` se o rótulo puder ser longo — evita quebrar linha e destimar a altura das outras métricas na mesma grade); valor abaixo em destaque `text-2xl font-semibold`, usando cor de destaque real do design system (`text-primary`, `text-warm`, `text-cool`, `text-alert-foreground`) — nunca uma cor nova.

## 9. Scroll

- Listas/painéis com rolagem própria usam a utilidade `.scrollbar-thin` (definida em `src/app/styles/animations.css`, com suporte a Firefox via `scrollbar-width`/`scrollbar-color` e Chrome/Edge/Safari via `::-webkit-scrollbar`) em vez da scrollbar padrão do navegador.
- Modais/wizards cujo conteúdo pode cortar abruptamente ao rolar ganham um indicador de fade-out no fim da área rolável:
  ```tsx
  <div className="relative min-h-0 flex-1">
    <div className="h-full overflow-y-auto scrollbar-thin">{/* conteúdo */}</div>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-surface-low to-transparent" />
  </div>
  ```
  O tom inicial do gradiente (`from-*`) deve ser sempre igual ao `bg-*` real do container ambiente (`from-surface-low` num painel, `from-popover` dentro de um Dialog) — nunca uma cor fixa diferente da superfície onde o gradiente está.

## 9.1. Enforcement Automatizado — `npm run lint:tokens`

Regressão de token de design (hex cru ou classe Tailwind de cor bruta com equivalente semântico, ex: `bg-zinc-900` em vez de `bg-surface-low`) é o exato tipo de desvio que auditorias manuais (Login/Registro/Configurações) já encontraram mais de uma vez. `frontend/scripts/lint-tokens.mjs` bloqueia isso automaticamente (`npm run lint:tokens`, incluído em `npm run lint`), varrendo `src/**/*.{ts,tsx}` — exceto `src/app/styles/` (único lugar legítimo pra hex cru: arquivos de tema).

Paletas Tailwind cruas bloqueadas (têm equivalente semântico no projeto): `zinc`, `indigo`, `slate`, `red` (`bg-`/`text-`/`border-`).

**Exceção legítima** (cor de marca de terceiro, ex: o "G" colorido do Google em `GoogleAuthButton.tsx`, que não deve seguir o design system por ser identidade visual externa): comentário `// design-token-lint-ignore` na mesma linha ou na linha imediatamente anterior à ocorrência. Não abusar disso — é pra terceiros/casos excepcionais documentados, não pra "resolver" uma falha de lint sem migrar pro token certo.

## 10. Exemplos de Antes → Depois (auditorias já aplicadas)

Casos reais corrigidos nas auditorias de Automações/Layout/Dashboard/Dispositivos, pra referência rápida do tipo de desvio a evitar:

| Componente | Antes | Depois | Por quê |
|---|---|---|---|
| Painel de detalhe (Automações) | `bg-card` no painel, `bg-surface-container` nos blocos internos | `bg-surface-low` no painel, `bg-surface-container` nos blocos | painel estava mais claro que seus próprios filhos (elevação invertida) |
| Cards do wizard/modal de edição (Automações) | `bg-surface-container` dentro de um Dialog (`bg-popover` = mesmo valor) | `bg-surface-high` | filho no mesmo nível do próprio modal |
| Lista/painel externos (Automações) | `rounded-lg` no container E nos cards internos | `rounded-xl` no container, `rounded-lg` nos cards | raio idêntico entre pai e filho |
| Linha de lista (modo lista) | `border-b` em cada `AutomationRow` | `divide-y` no container pai | borda sobrando depois do último item |
| Labels de bloco ("GATILHO", "Dispositivos Online") | `text-[10px] font-semibold` | `text-xs font-medium uppercase tracking-wider` | tamanho fora da escala, peso reservado para títulos |
| KPI "Alertas de Segurança" (Dashboard) | label sem `truncate`, quebrava em 2 linhas | `min-w-0 flex-1 truncate` | quebra de linha desalinhava a altura dos 4 cards da mesma grade |
| `DeviceTypeFilterChips` (Dashboard) | aba sublinhada `font-mono`, `border-b-2`, `text-[11px]` | pill `h-8 px-3 text-sm`, igual ao `Pill.tsx` | filtro fora do padrão de pill definido na seção 8 |
| Chip ativo com hover "mais claro" (`DevicesGlanceBar`) | gradiente com stop em hex arbitrário mais claro que `surface-highest` | `bg-surface-highest` + `hover:brightness-110` | sem token acima de `surface-highest`; hex novo não é permitido |
| `DevicesGrid`, `DeviceListRow`, wizard de descoberta | `bg-[#1c1b1c]`, `text-[#c7c6cb]`, `border-[#46464b]/20` etc. | `bg-surface-low`, `text-muted-foreground`, `border-border-subtle/20` | hex cru duplicando token existente em vez da classe semântica |
| Modal de edição de preview de cômodo (Dashboard) | linha não selecionada em `bg-surface-low` dentro de um modal `bg-surface-container` | `bg-surface-high` (padrão) / `bg-surface-highest` (selecionado) | filho mais escuro que o próprio modal |

## 11. Skeletons e Perceived Performance

> Numeração sequencial à última seção existente no momento desta auditoria (Skeletons/Perceived Performance). Se outra auditoria em paralelo (ex: Error States) também propuser seção nova, renumerar ao mesclar — o conteúdo abaixo não depende do número em si.

Todo estado de carregamento de dado assíncrono (`useQuery`/`useMutation` do TanStack Query) segue este padrão — validado nesta auditoria contra Rooms, Devices, Automações, Grupos, Histórico e Dashboard.

### 11.1. Filosofia — Progressive Hydration, não tela bloqueada
O modelo antigo (spinner central bloqueando a tela inteira até tudo responder) é proibido para novo código e deve ser migrado onde ainda existir. Cada componente é dono do próprio estado de carregamento — o layout estático (cascas) nunca espera pelo dado. Isso já é a filosofia por trás do `useScrollFade` e da remoção de chrome de painel mobile (ver `responsive-design.md`, seções 8 e 13.8): cada peça da UI monta o quanto antes, sem esperar a peça vizinha.

### 11.2. As Três Regras Inegociáveis
1. **Cascas estáticas nunca têm skeleton.** Título de página, breadcrumbs, abas, sidebar, botões de filtro montam no primeiro render — eles não dependem de rede.
2. **Spinner só em ação ativa do usuário.** Dentro de um botão durante submit/mutação, num toggle/switch durante `isPending`, ou num "carregar mais" de paginação incremental. Nunca solto ocupando uma área de conteúdo estruturado (lista, card, painel, gráfico) — isso é sempre skeleton.
3. **Zero CLS.** O skeleton espelha exatamente a dimensão real do componente carregado — mesma altura, padding, gap e border-radius. Nenhum salto entre o placeholder e o dado real.

### 11.3. Co-location vs. Arquivo Separado
- **Co-located** (`export function XSkeleton()` no mesmo arquivo do componente real): itens de lista, cards atômicos, blocos com < 30-40 linhas de layout. Ex.: `AutomationSkeletonRow` (exportado de `ActiveAutomationsCard.tsx`), os blocos `h-14 animate-pulse` em `DeviceLinkedAutomations.tsx`/`RoomLinkedAutomations.tsx`/`DeviceGroupLinkedAutomations.tsx` (mesmo padrão aplicado em `DeviceActivityFeed.tsx`/`RoomActivityFeed.tsx`), `EditDeviceModalSkeleton` (co-located em `EditDeviceModal.tsx`, espelha cabeçalho/grid de campos/tabs/pills/rodapé do form real), `ActivityTimelineRowSkeleton` (co-located em `ActivityLogTimeline.tsx`, espelha o `ActivityTimelineRow` real e visualmente distinto do empty state), `DiscoveryDeviceCardSkeleton` (co-located em `DiscoveryStepFound.tsx`, espelha card de dispositivo descoberto), `ResetPasswordSkeleton` (co-located em `ResetPasswordForm.tsx`, espelha campos de senha e botão submit) e `SpotifyNowPlayingSkeleton` (co-located em `SpotifyNowPlayingCard.tsx`, espelha capa e controles).
- **Arquivo separado** (`*.skeleton.tsx`): grids compostos com lógica de repetição, gráficos SVG, ou componentes `React.lazy()`. Ex.: `RoomDeviceSectionSkeleton.tsx`, `HistorySkeleton.tsx` — e os três skeletons de painel master: `room-list-panel.skeleton.tsx` (`RoomListPanelSkeleton`), `device-group-list-panel.skeleton.tsx` (`DeviceGroupListPanelSkeleton`) e `automation-list-panel.skeleton.tsx` (`AutomationListPanelSkeleton`, que reaproveita o `AutomationSkeletonRow` já existente em vez de criar um novo shape visual). Os três substituíram o antigo spinner central + texto ("Carregando ambientes/grupos/automações...") de `RoomsView.tsx`, `DeviceGroupsView.tsx` e `AutomationsView.tsx`, espelhando a casca inteira do painel (header com contador/busca/criar + linhas da lista) — não só as linhas — já que nenhuma parte do painel real existe ainda durante o carregamento inicial.
- **Gráfico já carregado dentro de outro contexto** (Sheet/painel): `DeviceTelemetrySheet.tsx` (`isLoading` do histórico de telemetria) segue o mesmo padrão de bloco único já usado em `DeviceEnergyChart.tsx`/`RoomEnergyChart.tsx` (`h-52 w-full animate-pulse bg-surface-high/60`) em vez de inventar uma variação nova pro mesmo tipo de conteúdo (gráfico).
- **Indicador inline mínimo**: `EditDeviceGeneralTab.tsx` e `DiscoveryStepConfigure.tsx` usam pulso pequeno (`h-3 w-3 rounded-full bg-surface-high animate-pulse`, `role="status"` com `aria-label` em vez de `aria-busy` no container — indicador isolado sem texto solto). Da mesma forma, os selects de dispositivo em formulários (`TriggerConfigStep.tsx` e `ActionsStep.tsx`) utilizam containers pulsantes (`h-11 sm:h-9 w-full rounded-lg bg-surface-high animate-pulse`) durante o carregamento de periféricos disponíveis.

#### Mapeamento de Implementações no Projeto

| Componente / Área | Estratégia | Arquivo de Origem | Formato do Placeholder |
|---|---|---|---|
| `RoomListPanel` | Arquivo separado | `room-list-panel.skeleton.tsx` | Casca do painel master (contador, busca, 5 rows) |
| `DeviceGroupListPanel` | Arquivo separado | `device-group-list-panel.skeleton.tsx` | Casca do painel master (contador, busca, 5 rows) |
| `AutomationListPanel` | Arquivo separado | `automation-list-panel.skeleton.tsx` | Casca do painel master (contador, tabs, busca, rows) |
| `DeviceListPanel` | Co-located / Modular | `DeviceListPanel.tsx` | 5 linhas `h-14` pulsantes na lista preservando toolbar |
| `RoomDeviceSection` | Arquivo separado | `RoomDeviceSectionSkeleton.tsx` | Cabeçalho de cômodo + grid de cards de dispositivos |
| `HistoryView` | Arquivo separado | `HistorySkeleton.tsx` | Timeline de eventos com badges e blocos de detalhe |
| `StatusHubSummary` | Co-located | `StatusHubSummary.tsx` | Grid 4 colunas com cards KPI `h-24` em `animate-pulse` |
| `EnergyLoadWidget` | Co-located | `EnergyLoadWidget.tsx` | Card com área gráfica `h-62.5` em `animate-pulse` |
| `RoomClimateSection` | Co-located | `RoomClimateSection.tsx` | Grid de cards KPI `h-18.5 bg-surface-high` |
| `EditDeviceModal` | Co-located | `EditDeviceModal.tsx` | `EditDeviceModalSkeleton` (header, tabs, form grid) |
| `ActivityLogTimeline` | Co-located | `ActivityLogTimeline.tsx` | `ActivityTimelineRowSkeleton` (3 linhas de evento) |
| `AutomationExecutionSection` | Co-located | `AutomationExecutionSection.tsx` | Bloco gráfico `h-40` + 2 linhas de histórico |
| `DeviceTelemetrySheet` | Bloco único | `DeviceTelemetrySheet.tsx` | Bloco gráfico `h-52 animate-pulse bg-surface-high/60` |
| `DeviceActivityFeed` / `RoomActivityFeed` | Co-located | `DeviceActivityFeed.tsx` / `RoomActivityFeed.tsx` | 2 linhas `h-14 animate-pulse rounded-lg` |
| `RoomDeviceAssignmentPicker` | Co-located | `RoomDeviceAssignmentPicker.tsx` | `RowSkeleton` (3 linhas de picker com checkbox) |
| `DeviceGroupMultiSelect` | Co-located | `DeviceGroupMultiSelect.tsx` | `RowSkeleton` (3 linhas de picker com checkbox) |
| `DiscoveryStepFound` | Co-located | `DiscoveryStepFound.tsx` | `DiscoveryDeviceCardSkeleton` (grid 2 colunas) |
| `ResetPasswordForm` | Co-located | `ResetPasswordForm.tsx` | `ResetPasswordSkeleton` (inputs de senha e botão) |
| `SpotifyNowPlayingCard` | Co-located | `SpotifyNowPlayingCard.tsx` | `SpotifyNowPlayingSkeleton` (capa e controles) |
| `AutomationListPanel` (paginação) | Reuso modular | `AutomationListPanel.tsx` | `AutomationSkeletonRow` na cauda (`isLoadingMore`) |

### 11.4. Padrão de Consumo
```tsx
const { data, isLoading, isError } = useEntityQuery(params);

if (isLoading) return <EntitySkeleton />;
if (isError) return <EntityErrorState onRetry={refetch} />;
return <EntityContent data={data} />;
```
Sem `React.lazy()`, não há necessidade de `<Suspense>` — o guard de `isLoading` do TanStack Query já cobre o caso. `Suspense` só entra pro fallback de rota (`RoutePendingFallback.tsx`, chunk de código, não dado de API).

### 11.5. Tokens e Acessibilidade
- Usar exclusivamente `bg-surface-low`/`bg-surface-container`/`bg-surface-high` + `animate-pulse`. Sem hex cru, sem opacidade arbitrária — `frontend/scripts/lint-tokens.mjs` bloqueia desvio.
- Como os tokens de superfície são aliases (seção 1 deste documento), o skeleton herda automaticamente contraste correto nos 5 presets de tema (`zinc`, `indigo`, `slate-cyan`, `github-dimmed`, `contrast-safe-graphite`) sem precisar de override — não introduzir cor fixa que quebraria isso num preset alternativo.
- Nó em loading precisa de `role="status"` e `aria-busy="true"` no container do skeleton (não em cada bloco pulsante individual), acompanhado obrigatoriamente de `<span className="sr-only">Texto descritivo...</span>` para leitor de tela anunciar o carregamento de forma limpa em vez de narrar múltiplos retângulos vazios.