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

## 12. Resiliência e Error States

Todo estado de erro de dado assíncrono (`useQuery`/`useMutation` do TanStack Query) segue este padrão — auditado contra Rooms, Devices, Automações, Grupos, Histórico e Dashboard, que hoje concentram o desvio mais grave: cascata de caixas vermelhas duplicadas na mesma falha de rede (Dashboard chega a 5 simultâneas) e, em `DeviceListPanel.tsx`, uma falha de API mascarada como "lista vazia" por ausência total de tratamento.

### 12.1. Filosofia — Degradação Graciosa, não Pânico
Um erro de rede num painel operacional não é uma emergência visual. A UI deve comunicar "não deu pra atualizar isso agora" sem competir por atenção com alertas vermelhos grandes — reservar vermelho/`destructive` pra ações destrutivas reais (excluir) e falhas sistêmicas confirmadas, nunca pra "essa query específica ainda não respondeu".

**Stale-While-Revalidate é mandatório quando há cache válido** (implementado): se o TanStack Query ainda tem `data` de um fetch anterior bem-sucedido, uma falha de *refetch* em background nunca substitui esse conteúdo pelo fallback de erro — mostra os dados desatualizados com `core/components/feedback/StaleDataIndicator.tsx` (ícone `AlertCircle` `h-3 w-3 text-warm`, `title`/`aria-label` nativos com o texto de `common:status.staleData`) em vez de destruir o que já estava na tela. Critério: `isError && !data` → fallback de erro completo (sem cache nenhum); `isError && data` → conteúdo normal com `data` do cache + `StaleDataIndicator`; sem `isError` → conteúdo normal sem indicador.

**Todos os pontos mapeados na auditoria estão cobertos.** Rodada 1 (maior tráfego): `DeviceListPanel.tsx` (indicador no contador "N dispositivos"), `RoomsView.tsx`/`DeviceGroupsView.tsx`/`AutomationsView.tsx` (indicador no `<h1>` da tela), `StatusHubSummary.tsx` (indicador no Card 1 de KPI), `EnergyLoadWidget.tsx` (indicador no título do card), `widgets/dashboard/DashboardView.tsx` seção de cômodos (indicador na barra de "expandir/recolher todos", só quando `roomsData` e `devicesPage` têm cache), `ActiveAutomationsCard.tsx`/`ActivityLogTimeline.tsx` (indicador no título do card).

Rodada 2 (menor tráfego, painéis de detalhe): `DeviceEnergyChart.tsx`/`RoomEnergyChart.tsx` (indicador no título do gráfico), `RoomClimateSection.tsx` (indicador sobreposto no canto do grid de KPIs, já que o componente não tem `<h3>` próprio), `DeviceLinkedAutomations.tsx`/`RoomLinkedAutomations.tsx`/`DeviceGroupLinkedAutomations.tsx` (indicador no título da lista), e `EditDeviceModal.tsx` (indicador no `DialogTitle`) — avaliado e **incluído**: apesar do cenário "background refetch num modal aberto" ser raro, aplicar o critério aqui é ainda mais importante que nos outros pontos, porque a versão anterior (sem stale-while-revalidate) destruía o formulário inteiro — inclusive edições não salvas do usuário — assim que `refetchOnWindowFocus` disparasse e falhasse (ex: usuário troca de aba com o modal aberto, volta, e a revalidação em background falha).

**Tensão com a seção 12.2 (banner sistêmico) — resolvida**: `useSystemicFailureDetector` agora recebe `hasData` por query (não só `isError`) e só conta como "falha" pro cálculo de `isSystemic` uma query `isError && !hasData`. Uma query `isError && hasData` (stale, já degradando graciosamente) nunca contribui pro banner sistêmico — só outages reais, sem cache pra mostrar em 2+ áreas ao mesmo tempo, disparam o banner consolidado.

### 12.2. Hierarquia de Tratamento: Local vs. Sistêmico
Nunca tratar "essa query falhou" e "a API está fora do ar" da mesma forma — são causas raiz diferentes e merecem UI diferente:

- **Nível Local (uma query, um card)**: fallback compacto, neutro, dentro do próprio espaço do card — nunca vermelho. Ver 12.3.
- **Nível Sistêmico (múltiplas queries sem cache falhando simultaneamente, ou erro de rede/5xx confirmado)**: quando 2+ queries independentes na mesma tela falham ao mesmo tempo **sem ter cache pra mostrar** (sintoma real de outage, não de um endpoint específico com bug, e não de uma query que já está degradando graciosamente via stale-while-revalidate — seção 12.1), a tela deve suprimir os fallbacks locais individuais e mostrar **um único banner consolidado no topo** com ação única "Tentar novamente" que dispara o retry de todas as queries afetadas de uma vez — nunca N botões de retry independentes na mesma viewport pro mesmo evento de falha. Uma query `isError` com cache válido (stale) nunca conta pro cálculo de falha sistêmica — ela já está resolvida localmente.

**Implementado no Dashboard** (referência viva do padrão):
- `core/hooks/useSystemicFailureDetector.ts` — hook agnóstico de domínio: recebe uma lista de `{ isError, hasData, refetch }` (uma entrada por query relevante da tela) e devolve `{ isSystemic, failingCount, retryAll }`. `isSystemic` vira `true` a partir de 2 queries `isError && !hasData` ao mesmo tempo — uma query com `hasData: true` (cache válido, já mostrando conteúdo stale) nunca entra nesse cálculo. `retryAll()` dispara `refetch()` em toda query `isError` (com ou sem cache).
- `widgets/dashboard/DashboardView.tsx` consome o detector no nível do widget (não em cada card): monta a lista com as 5 queries que alimentam as 5 áreas do Dashboard (`useDashboardOverview`, `useRooms`, `useDevices`, `useRecentAutomations`, `useActivityLog`), passando `hasData: Boolean(data)` de cada uma, e passa `isSystemic` como prop `suppressErrorUI` pra `StatusHubSummary`, `EnergyLoadWidget`, `ActiveAutomationsCard`, `ActivityLogTimeline` e pro bloco de seção de cômodos (inline no próprio `DashboardView`).
- `features/dashboard/components/SystemicFailureBanner.tsx` — o único banner consolidado, renderizado no topo da tela só quando `isSystemic` é `true`, com ação única `retryAll`.
- Cada um dos 5 consumidores, quando `suppressErrorUI` é `true` e a própria query está em erro, **não** renderiza seu `CardErrorFallback` local (mensagem + retry próprio) — em vez disso reaproveita o próprio skeleton do componente (`StatusHubSummarySkeleton`, `EnergyLoadWidgetSkeleton`, `RoomDeviceSectionSkeleton`, `AutomationSkeletonRow` ×3, `ActivityTimelineSkeletonRows`) como placeholder estático, preservando a dimensão exata sem introduzir uma segunda mensagem de erro (decisão: reaproveitar o skeleton existente em vez de criar um terceiro visual novo só pra esse estado — é a opção mais simples que já garante zero CLS de graça, por já ter sido construída pra bater com o layout real).
- `DashboardErrorState.tsx` (o componente vermelho antigo) foi **removido** — sem consumidores restantes após a migração de todos os 5 pontos pra `CardErrorFallback` (caso local) + `SystemicFailureBanner` (caso sistêmico).

### 12.3. Fallback Local — Regras de Estilo
Baseado no padrão que já existe (e funciona bem) em `DeviceEnergyChart.tsx`/`RoomEnergyChart.tsx`/`RoomClimateSection.tsx`/`DeviceLinkedAutomations.tsx`/`RoomLinkedAutomations.tsx`/`DeviceGroupLinkedAutomations.tsx` — a diferença é parar de duplicar esse bloco 6 vezes e extrair componente:

```tsx
<CardErrorFallback
  message={t("energy.errorLoad")}
  onRetry={refetch}
/>
```
- Container: `border-dashed border-border-subtle bg-surface-low/50` (nunca `border-destructive`/`bg-destructive`) — a exceção é o banner sistêmico da seção 12.2, onde `border-destructive`/`text-destructive` é apropriado porque ali a severidade é real e confirmada.
- Botão de retry: `variant="ghost"` ou `variant="link"`, nunca um botão com borda pesada/cor de destaque — é uma ação secundária de recuperação, não uma CTA primária.
- Texto: uma linha só, `text-xs text-muted-foreground` — sem título + subtítulo + parágrafo (o padrão do `DashboardErrorState` atual, com `text-sm font-semibold` + `text-xs` + botão, é verboso demais pro espaço de um card).

### 12.4. Zero CLS — Paridade com o Skeleton
**Regra mandatória**: o fallback de erro de um componente deve ocupar exatamente a mesma altura/grid/border-radius do seu Skeleton (seção 11) — os dois são "a mesma caixa vazia", só muda o conteúdo interno (pulso vs. mensagem+retry). Casos já corrigidos:

- **`StatusHubSummary.tsx`** (skeleton em grid de 4 cards `h-24`): o erro LOCAL (só esta query falhou, as outras 4 do Dashboard seguem OK) preserva o grid inteiro — cada uma das 4 células vira seu próprio `role="alert"` `h-24`, minimalista (ícone + retry, sem repetir a frase completa 4x — a mensagem completa vai em `aria-label` de cada célula, pra leitor de tela). Nunca mais colapsa pra uma caixa única centralizada. Quando a falha é sistêmica (2+ queries do Dashboard ao mesmo tempo), o caminho passa a ser o banner da seção 12.2, que suprime esse grid de erro por completo em favor do skeleton estático — zero CLS de verdade, por reaproveitar a peça já construída pro layout real.
- **`RoomsView.tsx` / `DeviceGroupsView.tsx` / `AutomationsView.tsx`**: o skeleton desses 3 painéis master espelha a casca inteira (header+contador+busca+N linhas, `rounded-xl bg-surface-low`, preenchendo o wrapper `min-h-0 flex-1`). O erro LOCAL agora usa `CardErrorFallback` com `className="h-full flex-col justify-center gap-3 rounded-xl bg-surface-low/50 p-6 text-center text-sm"` dentro do mesmo wrapper `min-h-0 flex-1` — ocupa exatamente o espaço do painel (não um card centralizado menor) com tom neutro (`border-dashed`), nunca mais `border-destructive`/`bg-destructive`.

Acessibilidade mandatória: o container do fallback leva `role="alert"` (não `role="status"` — é usado no skeleton, ver seção 11.5 — erro é conteúdo que interrompe, não um estado transitório) e a mensagem de erro deve ser texto real ou `aria-label` (nunca só ícone), pra leitor de tela anunciar o problema sem depender de contexto visual.

### 12.5. Guia Estrutural FSD — Co-location vs. Compartilhado
- **Co-located** (`export function XErrorFallback()` no mesmo arquivo): fallback com layout exclusivo daquele card, < 30 linhas, que não se repete em nenhum outro lugar do projeto. Ex.: `EditDeviceModalErrorFallback` (`EditDeviceModal.tsx`) — tem 2 ações (Fechar + Tentar novamente) em vez de 1, estrutura suficientemente diferente do padrão de card pra não entrar no componente compartilhado.
- **`core/components/feedback/CardErrorFallback.tsx`** (implementado): fallback compacto genérico — `message`/`children`, `retryLabel` (texto do botão fica a cargo de cada chamador, que traduz no próprio namespace — evita fixar um texto só no componente agnóstico), `onRetry`, `className` (pra ajustar dimensão/superfície por card, preservando paridade com o skeleton específico). `role="alert"` embutido, não repetido no chamador. Mora em `core/` (não `shared/`) por ser agnóstico de domínio, na mesma linha de `core/components/ui/`.

  Pontos de consumo atuais:
  | Componente | `className` extra |
  |---|---|
  | `DeviceEnergyChart.tsx` | — (padrão) |
  | `RoomEnergyChart.tsx` | — (padrão) |
  | `RoomClimateSection.tsx` | — (padrão) |
  | `DeviceLinkedAutomations.tsx` | — (padrão) |
  | `RoomLinkedAutomations.tsx` | — (padrão) |
  | `DeviceGroupLinkedAutomations.tsx` | — (padrão) |
  | `DeviceListPanel.tsx` | `bg-surface-low/50` |
  | `StatusHubSummary.tsx` | `min-h-24` |
  | `EnergyLoadWidget.tsx` | — (padrão, dentro de wrapper `h-62.5` próprio) |
  | `ActiveAutomationsCard.tsx` | — (padrão) |
  | `ActivityLogTimeline.tsx` | — (padrão, dentro de wrapper `h-80` próprio) |
  | `DashboardView.tsx` (seção de cômodos) | — (padrão) |
- **`features/dashboard/components/DashboardErrorState.tsx`** — **removido**. Descontinuado em favor do `CardErrorFallback` genérico (caso local) e do `SystemicFailureBanner` (caso sistêmico, seção 12.2) — sem consumidores restantes após a migração dos 5 pontos do Dashboard que ainda o usavam.