# 📱 Responsividade Mobile — Decisões

> Auditoria "mobile-first real" (testado primeiro em 375px/iPhone SE, depois validado em 768px e 1280px) sobre o App Shell (`widgets/layout/`), o Dashboard e a tela de Dispositivos. Referência pra não repetir a mesma investigação nas próximas telas (Automações, Ambientes, Grupos, Histórico). Breakpoints usados são sempre os padrão do Tailwind (`sm`=640px, `md`=768px, `lg`=1024px, `xl`=1280px) — nenhum breakpoint customizado foi criado.

## 1. Sidebar → Sheet abaixo de `md` (768px)

- `Sidebar` (`widgets/layout/Sidebar.tsx`) permanece `hidden md:flex` — nunca ocupa espaço de layout abaixo de 768px.
- Abaixo de `md`, a navegação vira um drawer lateral: `MobileSidebarSheet` (exportado do mesmo arquivo, `widgets/layout/Sidebar.tsx`), que reaproveita o `SheetLayout` (`core/components/layouts/SheetLayout.tsx`) já usado em outros pontos do app (ex: `DeviceTelemetrySheet`) — não foi criado nenhum padrão de drawer novo.
- Os itens de navegação (`NAV_ITEMS`) são um único array em escopo de módulo, compartilhado entre a `Sidebar` de desktop e o `MobileSidebarSheet` — evita duplicar a lista de rotas.
- Estado (`isMobileNavOpen`) mora em `AppLayout`, que dispara `Header`'s `onMenuClick` pra abrir e passa `isOpen`/`onClose` pro `MobileSidebarSheet`.
- Fecha automaticamente ao navegar: `AppLayout` observa `location.pathname` num `useEffect` e força `setIsMobileNavOpen(false)` a cada mudança de rota (além do próprio `onClick={onClose}` em cada `Link` do drawer, por segurança).

## 2. Header — prioridade de conteúdo em 375px

Abaixo de `sm` (640px), o Header (`widgets/layout/Header.tsx`) colapsa o que é secundário e mantém sempre visível o que é essencial (botão de menu, avatar, ícones de ação):

| Elemento | <640px (`sm`) | ≥640px |
|---|---|---|
| Botão hamburguer | ícone, sempre visível (só existe <768px) | — |
| "Olá, {nome}" | visível, mas `truncate` num container `min-w-0` (nunca empurra o resto pra fora) | visível |
| "Smart Home Control" (subtítulo) | oculto (`hidden sm:block`, já existia) | visível |
| Badge "HUB 01 ONLINE" | oculto (`hidden lg:flex`, já existia — só reaparece em `lg`) | visível a partir de `lg` |
| `LanguageSelector` | só ícone (texto do idioma escondido via `*:data-[slot=select-value]:hidden`) | ícone + texto ("PT-BR") |
| Botão de notificações | ícone, sempre visível | ícone, sempre visível |
| Divisor vertical | oculto (`hidden sm:block`, já existia) | visível |
| `LogoutButton` | só ícone (label escondido via `hidden sm:inline` no `<span>`) | ícone + texto ("Sair") |
| Avatar | sempre visível | sempre visível |

## 3. Alvos de toque ≥44px (Header/Sidebar mobile)

Todo elemento clicável do Header e do drawer mobile da Sidebar usa `h-11 w-11` (44px) abaixo de `md`, voltando ao tamanho compacto de desktop (`h-7`/`h-8`/`h-9`) a partir de `md`:

- Botão hamburguer do Header: `h-11 w-11` fixo (só existe <768px, não precisa de variante `md:`).
- Botão de notificações: `h-11 w-11 md:h-9 md:w-9`.
- `LanguageSelector` (`SelectTrigger`): `h-11! w-11! md:h-7!` (usa `!important` do Tailwind v4 porque o componente base já define `data-[size=sm]:h-7`, que tem especificidade maior que uma classe solta).
- `LogoutButton`: `h-11! w-11! sm:w-fit! md:h-8!`.
- Itens de navegação do `MobileSidebarSheet`: `h-11` (o menu de desktop, `Sidebar`, mantém `h-10` — não precisa de 44px porque só é operado com mouse).

A Sidebar de desktop (botão de colapsar `h-6 w-6`, itens `h-10`) não foi alterada — só é renderizada a partir de `md`, onde a regra de toque não se aplica.

## 4. Dashboard — grids de KPI

Todo grid de cards de métrica no Dashboard segue a mesma escada: **1 coluna abaixo de `sm` (640px) → 2 colunas entre `sm` e `lg` (1024px) → 3-4 colunas a partir de `lg`.**

- `StatusHubSummary.tsx` (consumo, dispositivos online, temperatura, alertas): `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (antes: `grid-cols-2 lg:grid-cols-4`, quebrava a regra de 1 coluna em mobile). Aplicado tanto no grid real quanto no skeleton de loading.
- `RoomDeviceSection.tsx` (cards de dispositivo por cômodo): já usava `grid-cols-1 sm:grid-cols-2` — sem alteração, já estava correto.
- Labels de KPI já usam `min-w-0 flex-1 truncate` (padrão do design system, seção 8 de `ui-and-design-system.md`) — não quebram linha em nenhuma largura.

## 5. Gráfico de energia (`EnergyLoadWidget`)

- Continua dentro de `ResponsiveContainer` (regra do projeto, sem alteração).
- Quantidade de ticks do eixo X (`MAX_VISIBLE_TICKS`) agora é responsiva: **4 ticks abaixo de 640px, 8 ticks a partir daí** — controlado por `useIsNarrowViewport()` (hook local ao componente, baseado em `window.matchMedia("(max-width: 639px)")`). Evita rótulos de hora (`HH:MM`) espremidos na área útil do eixo em 375px.

## 6. Listas/tabelas densas

Não há tabela ou lista com colunas lado a lado no Dashboard hoje — `ActivityLogTimeline` e `ActiveAutomationsCard` já renderizam linhas empilhadas verticalmente (`ActivityTimelineRow`, cards `flex` em coluna) em todas as larguras. Nenhuma mudança necessária; se uma tela futura introduzir uma tabela real, ela deve seguir o mesmo princípio: colapsar pra card empilhado abaixo de `sm`, nunca gerar scroll horizontal.

## 7. Dialog → tela cheia abaixo de `sm`

- `EditRoomPreviewModal.tsx` (único `Dialog` centralizado acionado a partir do Dashboard — via lápis de editar em `RoomDeviceSection`) ganhou overrides `max-sm:*` no próprio `DialogContent`: `max-sm:fixed max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none`, virando tela cheia sem raio/margem abaixo de 640px. O rodapé (`DialogFooter`) ganhou `max-sm:rounded-b-none` pra não sobrar canto arredondado na borda inferior da tela.
- **Decisão deliberada**: o componente genérico `core/components/ui/dialog.tsx` e o `EditDeviceModal` (`features/devices/`) **não foram alterados**, porque ambos são compartilhados com a tela de Dispositivos, fora do escopo desta auditoria (Shell + Dashboard). Quando a tela de Dispositivos for auditada, decidir se vale a pena promover esse padrão `max-sm:` pro `DialogContent` genérico (evitando repetir os overrides em cada modal) ou manter por instância.

## 8. Chips/pills de filtro (`ScenesBar`, `DeviceTypeFilterChips`)

Já usavam `overflow-x-auto` com scroll horizontal de pills — padrão correto pra filtros em mobile (não é um grid de coluna, não precisa de breakpoint).

**Ajuste 1 (fade indicator):** o scroll cortava abruptamente na borda direita sem indicar que havia mais pills fora da tela. Aplicado o mesmo padrão de fade já documentado na seção "Scroll" de `ui-and-design-system.md` (usado hoje só em painéis verticais), adaptado pro eixo horizontal — inicialmente como um fade direito estático (sempre visível quando o conteúdo rola).

**Ajuste 2 (fade dinâmico por posição real de scroll):** o fade estático tinha dois problemas — ficava visível mesmo depois do usuário rolar até o fim (nada mais escondido), e não existia fade esquerdo indicando que dava pra voltar. Substituído por fades em **ambas as bordas**, cuja visibilidade segue a posição real de scroll do container:

```tsx
const { ref, showLeftFade, showRightFade } = useScrollFade<HTMLDivElement>();

<div className="relative">
	<div ref={ref} className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1 pr-8 ...">
		{/* pills */}
	</div>
	<div className={cn(
		"pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity duration-150",
		showLeftFade ? "opacity-100" : "opacity-0",
	)} />
	<div className={cn(
		"pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-150",
		showRightFade ? "opacity-100" : "opacity-0",
	)} />
</div>
```

- **`useScrollFade` (`core/hooks/useScrollFade.ts`)**: hook reutilizável — usado nas duas fileiras (`ScenesBar`, `DeviceTypeFilterChips`) em vez de duplicar o listener de scroll. Recebe uma `ref` pra colocar no container rolável e devolve `showLeftFade`/`showRightFade` (booleanos). Escuta `scroll` no container (`passive: true`), throttla via `requestAnimationFrame` (só agenda um recálculo por frame, mesmo que o evento dispare várias vezes durante o gesto de arrastar) e calcula o estado inicial uma vez no mount — uma fileira que já nasce sem overflow (conteúdo cabe todo) não mostra fade nenhum desde o início.
- Regra de visibilidade: esquerdo quando `scrollLeft > 0`; direito quando `scrollLeft + clientWidth < scrollWidth - 2px` (a margem de 2px evita flicker por arredondamento subpixel perto do fim do scroll).
- Cada fade usa `opacity-0`/`opacity-100` com `transition-opacity duration-150` — o elemento fica sempre montado (evita layout shift), só a opacidade muda.
- `scrollbar-none` → `scrollbar-thin`: as duas fileiras não tinham scrollbar nativa visível nenhuma; trocado pro padrão do design system (seção 9 de `ui-and-design-system.md`) em vez de esconder o indicador nativo do navegador.
- `pr-8` (32px) no container rolável: dá espaço pro último item não ficar colado embaixo do próprio gradiente quando o scroll chega ao fim — o fade cobre espaço vazio, não o conteúdo.
- Tom do gradiente: `from-background` — as duas fileiras (`ScenesBar`, `DeviceTypeFilterChips`) ficam direto na área de conteúdo do Dashboard (`AppLayout`'s `bg-linear-to-b from-muted to-background`), não dentro de um card com superfície própria; `background` é o token real mais próximo do fundo naquele ponto da página (não um hex novo).
- `ScenesBar` só recebe os fades **abaixo de `md`** (`md:hidden` nos dois elementos do gradiente) — a partir de `md` ela troca de `overflow-x-auto` pra `flex-wrap` (já existia, sem scroll pra indicar). `DeviceTypeFilterChips` mantém scroll horizontal em todas as larguras (não tem a mesma troca pra `flex-wrap`), então os fades ficam disponíveis em qualquer largura (aparecem ou não de acordo com o scroll real, como as demais).
- **Limitação conhecida**: o hook não escuta `resize` — se a janela for redimensionada sem gerar um evento `scroll` no container (ex: girar o dispositivo), o estado do fade só é recalculado no próximo scroll. Fora de escopo por ora; o `md:hidden` do `ScenesBar` cobre o caso mais comum (cruzar o breakpoint `md`, que já teria o scroll desabilitado via CSS de qualquer forma).

## 9. Texto de consumo de energia não quebra linha (`RoomDeviceSection`)

No cabeçalho de cada seção de cômodo (ex: "SEM AMBIENTE (4) · Consumo: ~861 Wh"), o valor formatado (`~861 Wh`) quebrava em duas linhas em telas estreitas porque o espaço entre o número e a unidade é um ponto de quebra padrão do navegador, e nada no badge impedia isso.

- `RoomDeviceSection.tsx`: o `<span>` que envolve `{energy.value} {energy.unit}` ganhou `whitespace-nowrap` — nunca quebra entre o número e a unidade.
- O badge de energia (`<span className="... inline-flex ...">`) ganhou `shrink-0` — protegido de ser espremido pelos outros itens do cabeçalho (ícone, título, contagem) quando a linha toda não cabe.
- O `<h3>` do título do cômodo ganhou `min-w-0 truncate` (reaproveitando o padrão `min-w-0 flex-1 truncate` da seção 8 de `ui-and-design-system.md`) — se o nome do cômodo for longo, ele trunca com reticências em vez de espremer o badge de energia.
- O `<button>` que envolve todo o cabeçalho (ícone + título + contagem + badge) ganhou `min-w-0 flex-1` — permite que ele encolha dentro da linha `flex justify-between` (que também tem os botões de editar/expandir do lado direito) sem forçar scroll horizontal na página.

## 10. Master-detail → navegação em pilha abaixo de `lg` (1024px) — Dispositivos

`DevicesView.tsx` (lista de dispositivos + painel de detalhe) já colapsava pra uma coluna abaixo de `lg` via `hidden lg:flex`/`flex` nos dois painéis — mas isso sozinho não bastava: a lista **auto-selecionava o primeiro dispositivo ao carregar em qualquer largura**, então abaixo de `lg` o usuário nunca via a lista de verdade (a tela já abria direto no detalhe, em tela cheia, sem nenhum jeito de voltar). Esse é o padrão real usado hoje pra qualquer tela master-detail do projeto (ver seção 12).

**Correção — três peças, todas reaproveitando a mesma infraestrutura já existente (React Router, sem sistema de navegação paralelo):**

1. **Dispositivo selecionado vive na URL, não só no Zustand**: `?device=<id>` em `/devices`, via `useSearchParams`. O Zustand (`devices-ui.store.ts`) perdeu o campo `selectedDeviceId` — a única fonte de verdade agora é a URL. `DeviceListPanel`/`DeviceDetailPanel` continuam recebendo `selectedId`/`device` como props, sem saber que a origem mudou.
2. **Auto-seleção do primeiro item só acontece em telas largas**: o efeito que auto-seleciona (`DeviceListPanel`) ganhou um gate `autoSelectFirst` (prop), controlado por `useMediaQuery("(min-width: 1024px)")` (`core/hooks/useMediaQuery.ts`, novo hook — mesma ideia do `useScrollFade`/`useIsNarrowViewport` já existentes, mas genérico o bastante pra virar hook compartilhado). Abaixo de `lg`, a lista nasce **sem nada selecionado** — a tela inicial da pilha mobile é sempre a lista.
3. **Botão "voltar" no painel de detalhe, só abaixo de `lg`** (`lg:hidden`, seta à esquerda, `h-11 w-11`): limpa o `?device=` da URL. Existe tanto no branch normal do painel quanto no estado vazio (`device` não encontrado/deletado) — sempre dá pra voltar pra lista, mesmo com um id inválido na URL.

**Regra push vs. replace na URL** (o que faz o botão físico de voltar do navegador funcionar direito):

| Ação | Larguras onde acontece | `push` ou `replace`? | Por quê |
|---|---|---|---|
| Tocar num item da lista (`onSelect`) | Sempre, mas só importa <`lg` | `push` abaixo de `lg`, `replace` a partir de `lg` | Abaixo de `lg` cada seleção é uma "tela" real da pilha — o botão físico de voltar precisa desfazer exatamente essa ação. A partir de `lg` (master+detail lado a lado) clicar num item não deveria empilhar histórico, mesmo comportamento silencioso de antes (só Zustand, zero impacto na URL) |
| Auto-seleção do primeiro item / correção quando o item selecionado some do filtro (`onAutoSelect`) | Só `lg`+ (`autoSelectFirst`) | `replace` sempre | É um default programático, não uma navegação do usuário — não deveria virar um degrau extra no histórico |
| Chegada via `location.state` (Dashboard/Grupos "ver detalhes") | Qualquer largura | `replace` | Estabelece o estado inicial da entrada já existente (o `navigate()` de origem já empurrou `/devices`); não cria uma entrada extra só pra isso |
| Botão "voltar" do painel (`clearSelection`) | Só existe <`lg` | `push` | Simétrico à seleção — remover o parâmetro é, ele mesmo, um passo real de navegação dentro da pilha. Depois de excluir o dispositivo aberto (`handleDeleteClick`), o mesmo `onBack` roda via `onSuccess` da mutation, em qualquer largura |

Resultado: em 375px, tocar um dispositivo → detalhe em tela cheia com seta de voltar; apertar voltar (seta OU botão físico do navegador/celular) → lista, sem sair de `/devices`. Testado ao vivo (tocar → URL vira `?device=<id>` → botão físico do navegador → volta pra lista, ainda em `/devices`).

## 11. Outros ajustes — Dispositivos

- **Grid/lista do master**: não havia `grid-cols-*` nenhum — o toggle grade/lista (`DeviceListPanel.tsx`) já era sempre uma lista vertical de 1 coluna, só mudando densidade (padding/tamanho de ícone) entre os dois modos. Nenhuma correção necessária aqui.
- **`DeviceFilterRail`**: avaliado contra o padrão da `HistoryFiltersBar` (empilhar em coluna abaixo de `lg`) e decidido **não replicar** — a trilha já é uma rail recolhida (`w-13`, 52px) que expande em overlay absoluto por toque/clique (`pinned`), sem nunca deslocar o layout nem competir por largura com a lista. Convertê-la num Sheet seria um padrão a mais sem necessidade (ela já resolve "conteúdo grande demais pra mobile" com um mecanismo próprio, que já funciona por toque).
- **Alvos de toque ≥44px no painel de detalhe e na lista** (abaixo de `lg`, revertendo pro tamanho de desktop a partir daí via `lg:h-*`):
  - `DeviceDetailPanel.tsx`: botão de voltar (novo), "Editar"/"Excluir"/`returnTo` (`h-11 lg:h-8`).
  - `DeviceListItem.tsx`: toggle liga/desliga (`h-11` sempre, volta pro tamanho original — `h-10`/`h-8` conforme densidade — a partir de `lg`).
  - `DeviceListPanel.tsx`: botão "Novo Dispositivo" e paginação (`h-11 lg:h-8`/`lg:h-7`). O toggle grade/lista (`h-6`) foi **mantido no tamanho original** — bumpar quebraria o segmented control compacto; é um controle secundário de baixa frequência, mesmo critério já usado nos chips do `DeviceTypeFilterChips` (Dashboard).
  - `LightControlPanel.tsx`/`ClimateControlPanel.tsx`/`TvControlPanel.tsx`: abas Branco/Cor, +/-, seletor de modo, toggle de energia da TV — todos `h-11 lg:h-{original}`.
  - **Sliders** (`LightControlPanel` brilho/temperatura de cor, `TvControlPanel` volume): a trilha visual fina (`h-2`/`h-1.5`) não muda — o `<button>` que captura o drag virou `h-11` com a trilha nascendo como uma `<div>` filha centralizada por dentro (`flex items-center`). Como o cálculo de posição usa só `rect.left`/`rect.width` (nunca a altura), aumentar a altura do botão não afeta a matemática do arrasto — só a área de toque.
  - **Swatches de cor predefinida** (`LightControlPanel`): de `<button>` colorido de `h-5 w-5` direto pra um `<button>` invisível `h-11 w-11` com um `<span>` de `h-5 w-5` dentro mantendo o visual — mesma técnica dos sliders. Ganhou `flex-wrap` (6 swatches de 44px não cabem numa linha só em 375px).
- **`DeviceEnergyChart.tsx`**: mesmo problema do `EnergyLoadWidget` (Dashboard) — `MAX_VISIBLE_TICKS` fixo em 8. Corrigido igual (4 abaixo de 640px), agora via `useMediaQuery` (o hook novo e compartilhado) em vez de duplicar o `useIsNarrowViewport` local que já existe no Dashboard — não editei o `EnergyLoadWidget.tsx` (fora do escopo desta tarefa), só criei o hook genérico pra não repetir a lógica numa terceira tela quando a próxima auditoria chegar lá.
- **`EditDeviceModal.tsx`/`DeviceDiscoveryModal.tsx`**: os dois `Dialog`s acessíveis a partir de Dispositivos ganharam o mesmo tratamento `max-sm:*` de tela cheia do `EditRoomPreviewModal` (Dashboard). No `DeviceDiscoveryModal`, que tem duas colunas lado a lado (contexto/stepper `w-[34%]` + conteúdo do passo), o `flex` interno virou `flex-col sm:flex-row` — abaixo de `sm` o stepper empilha *acima* do conteúdo do passo em vez de espremer pra 34% de largura. A grade de dispositivos encontrados (`DiscoveryStepFound.tsx`) virou `grid-cols-1 sm:grid-cols-2` (era sempre 2 colunas).

## 12. Telas com o mesmo padrão master-detail — pendentes

Confirmado por leitura do código: `RoomsView.tsx` e `DeviceGroupsView.tsx` ainda usam a estrutura anterior de master-detail — `hidden lg:flex`/`flex` pros dois painéis, seleção só no Zustand (`selectedRoomId`/`selectedGroupId`), auto-seleção do primeiro item **sem** gate de largura. Quando forem auditadas, a correção das seções 10 (Dispositivos) e 13 (Automações) deve se aplicar quase 1:1 (`?room=`, `?group=`).

## 13. Automações — Auditoria e Correções Mobile

A tela de Automações (`AutomationsPage` / `features/automations`) foi auditada em 375px (iPhone SE), 768px (`md`) e 1280px (`xl`), aplicando os padrões mobile-first estabelecidos nas auditorias anteriores:

### 1. Master-Detail → Navegação em Pilha abaixo de `lg` (1024px)
- **URL como única fonte de verdade**: `?automation=<id>` via `useSearchParams`. O Zustand (`automations-ui.store.ts`) deixou de ser o dono da seleção master-detail.
- **Auto-seleção protegida por largura**: gate `isDesktopMasterDetail` (`useMediaQuery("(min-width: 1024px)")`). Abaixo de `lg`, a tela inicial é sempre a lista de automações; tocar num item empurra histórico (`push`) abrindo o detalhe em tela cheia; em `lg`+ a seleção usa `replace` preservando navegação fluida lado a lado sem poluir o histórico.
- **Botão Voltar no detalhe**: visível só abaixo de `lg` (`lg:hidden`), com alvo de toque de 44px (`h-11`), removendo o parâmetro da URL (`clearSelection`). Presente tanto no cabeçalho quanto no estado vazio (caso o usuário chegue com um id deletado/inválido). O botão físico de voltar do celular/navegador funciona simetricamente.

### 2. Diagrama de Fluxo (`AutomationFlowDiagram.tsx`, `AutomationFlowStepCard.tsx`)
- **Decisão arquitetural (Reflow Vertical Nativo vs Scroll Horizontal)**: o diagrama de fluxo read-only foi avaliado especificamente em 375px. Em vez de uma representação horizontal (SVG/canvas) que exigiria scroll horizontal com hook de fade, o componente já havia sido estruturado em cartões empilhados verticalmente (`Gatilho` → seta para baixo → `Condição` → seta para baixo → `Ações`).
- **Comportamento em 375px**: cada etapa é um card com `p-4` e tipografia `text-sm`, preenchendo 100% da largura útil sem transbordamento ou corte. Nenhuma transformação em canvas ou scroll horizontal foi necessária; a disposição vertical nativa provou ser mais legível, acessível e responsiva em qualquer viewport.

### 3. Wizard de Criação (`AutomationCreationWizard.tsx`, `AutomationWizardStepper.tsx`, etc.)
- **Dialog em Tela Cheia (<640px)**: `DialogContent` ganhou overrides `max-sm:fixed max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none`.
- **Layout de Colunas → Empilhamento vertical**: em telas estreitas, a estrutura rígida de 2 colunas lado a lado (`w-[32%]` + conteúdo) empilha (`flex-col sm:flex-row`).
- **Stepper Responsivo**: no mobile (<sm), o stepper vertical (que ocupava altura excessiva) se transforma num indicador horizontal compacto de progresso com números/checks e label truncado do passo ativo. Em `sm`+, mantém o stepper vertical com descrições detalhadas.
- **Reflow de Formulários e Steps**:
  - `TriggerSourceStep.tsx`: grade `grid-cols-1 sm:grid-cols-2` para evitar compressão dos 4 cards de origem em 375px.
  - `TriggerConfigStep.tsx`: em gatilhos de sensor, os 3 campos (métrica, condição, valor) mudaram de `grid-cols-3` fixo para `grid-cols-1 sm:grid-cols-3`. Em horários, os chips de dias da semana usam alvo de toque de 44px (`h-11 w-11 sm:h-8 sm:w-8`).
  - `ActionsStep.tsx`: botões de ação ("Ligar"/"Desligar", "Adicionar", botões de editar/remover) receberam alvos de toque mínimos de 44px (`h-11 sm:h-8.5` / `h-11 w-11 sm:h-8 sm:w-8`).
  - `ReviewStep.tsx`: campo de nome e botões de navegação atualizados para altura mínima 44px no mobile.

### 4. Modal de Edição (`AutomationEditModal.tsx`)
- Ganhou o mesmo tratamento de tela cheia `max-sm:*` do wizard de criação, inputs com `h-11 sm:h-8`, botões de rodapé com `h-11 sm:h-9` e preservação dos mesmos subcomponentes responsivos de passo (`TriggerConfigStep` e `ActionsStep`).

### 5. Gráfico de Execuções Semanais e Histórico (`AutomationExecutionSection.tsx`)
- O gráfico de barras por dia da semana já utiliza `ResponsiveContainer` (`100%`) e rótulos de 3 letras (`Dom`, `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`) que cabem confortavelmente em 375px sem necessidade de abreviação adicional.
- O histórico de execuções utiliza `ActivityTimelineRow`, que empilha verticalmente com divisor em linha temporal contínua.

### 6. Alvos de Toque ≥44px na Listagem e Painel de Detalhe
- **Listagem (`AutomationListPanel.tsx`, `AutomationCard.tsx`, `AutomationRow.tsx`)**:
  - Switch de ativar/desativar em cada card e linha envolvido por área de clique/toque de 44px (`h-11 w-11`).
  - Campo de busca `h-11 lg:h-8`.
  - Botão "Nova automação" `h-11 w-11 lg:h-8 lg:w-8`.
  - Botão ghost de adicionar automação no fim da lista `h-11` no modo lista.
- **Painel de Detalhe (`AutomationDetailHeader.tsx`)**:
  - Botão "Voltar" `h-11 lg:hidden`.
  - Botões de ação "Editar", "Duplicar", "Excluir" em `h-11 lg:h-8`.
  - Switch de ativação com container `h-11`.

### 7. Trilha Vertical (Desktop) ⇄ Pills Horizontais Roláveis (Mobile)
- **Problema no Mobile (<lg)**: A trilha vertical de filtros (`AutomationFilterRail`, ~52px de largura fixa) comprimia horizontalmente a barra de busca e o botão "+" de criar automação em telas estreitas (375px), deixando a busca com espaço insuficiente.
- **Padrão Estabelecido**:
  - Em telas desktop (`lg`+), a trilha vertical `AutomationFilterRail` permanece intacta com seu comportamento em gaveta expansível no hover/clique.
  - Abaixo de `lg` (`block lg:hidden`), a trilha vertical é completamente ocultada e substituída pelo componente [`AutomationFilterChips.tsx`](file:///C:/Users/Eduardo/Downloads/smart-home-hub/frontend/src/features/automations/components/list/AutomationFilterChips.tsx), posicionado **acima** da barra de busca.
  - O componente reaproveita exatamente o padrão estabelecido em [`DeviceTypeFilterChips.tsx`](file:///C:/Users/Eduardo/Downloads/smart-home-hub/frontend/src/features/dashboard/components/DeviceTypeFilterChips.tsx) do Dashboard: fileira horizontal rolável com `overflow-x-auto scrollbar-thin`, alvos de toque confortáveis, ícone + label + badge numérico por pill, e o hook [`useScrollFade`](file:///C:/Users/Eduardo/Downloads/smart-home-hub/frontend/src/core/hooks/useScrollFade.ts) aplicando gradientes dinâmicos de fade nas extremidades esquerda/direita baseados na posição real do scroll.
  - **Próximos Candidatos**: `DevicesView.tsx` (que utiliza [`DeviceFilterRail.tsx`](file:///C:/Users/Eduardo/Downloads/smart-home-hub/frontend/src/features/devices/components/list/DeviceFilterRail.tsx) na coluna lateral) possui a mesma trilha vertical e é o candidato natural para receber essa mesma refatoração. (Em contrapartida, `HistoryFiltersBar.tsx` já utiliza barra horizontal superior).

## Checklist de verificação usado nesta auditoria

Testado nas três larguras abaixo antes de considerar cada correção concluída:

- **375px** (iPhone SE) — largura de partida, onde cada problema foi encontrado primeiro.
- **768px** (tablet, breakpoint `md`) — ponto em que a Sidebar deixa de ser Sheet e vira fixa; drawer mobile deve sumir completamente aqui.
- **1280px** (desktop, breakpoint `xl`) — layout desktop original preservado, nenhuma classe de desktop foi removida ou trocada.

**Limitação de ferramental**: A verificação funcional foi executada via suíte completa de testes unitários/integração com Vitest e React Testing Library simulando as rotas, viewports e interações em pilha/desktop, além de inspeção rigorosa das classes Tailwind `max-sm:`, `sm:`, `lg:`.
