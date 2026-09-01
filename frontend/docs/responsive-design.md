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

## 12. Telas com o mesmo padrão master-detail — ainda não corrigidas

Confirmado por leitura rápida do código (não corrigido agora, fora do escopo desta tarefa — só registrado pra não repetir a investigação): `AutomationsView.tsx`, `RoomsView.tsx` e `DeviceGroupsView.tsx` usam exatamente a mesma estrutura que `DevicesView.tsx` tinha antes desta auditoria — `hidden lg:flex`/`flex` pros dois painéis, seleção só no Zustand (`selectedId`/`selectedRoomId`/`selectedGroupId`), auto-seleção do primeiro item **sem** gate de largura. Ou seja, as três têm o mesmo bug: abaixo de `lg`, abrem direto no painel de detalhe (tela cheia) sem nenhum jeito de voltar pra lista, e o botão físico de voltar do navegador não desfaz a seleção. Quando alguma dessas telas for auditada, a correção da seção 10 (URL via `useSearchParams`, `autoSelectFirst` com `useMediaQuery`, botão de voltar `lg:hidden`) deve se aplicar quase 1:1 — só trocando o nome do parâmetro (`?room=`, `?group=`, `?automation=`) e o hook de store correspondente.

## Checklist de verificação usado nesta auditoria

Testado nas três larguras abaixo antes de considerar cada correção concluída:

- **375px** (iPhone SE) — largura de partida, onde cada problema foi encontrado primeiro.
- **768px** (tablet, breakpoint `md`) — ponto em que a Sidebar deixa de ser Sheet e vira fixa; drawer mobile deve sumir completamente aqui.
- **1280px** (desktop, breakpoint `xl`) — layout desktop original preservado, nenhuma classe de desktop foi removida ou trocada.

**Limitação de ferramental (auditoria de Dispositivos)**: a ferramenta de resize do browser usada nas sessões foi inconsistente — funcionou para confirmar 375px ao vivo (drawer, navegação em pilha, `Dialog`s em tela cheia, todos testados e corretos), mas travou em 375px ao tentar redimensionar pra 768px/1280px na mesma sessão (mesmo problema pontual das duas auditorias anteriores). 768px e 1280px **não foram confirmados visualmente** desta vez — só por leitura de código, verificando que todo override novo é `lg:`/`sm:`/`max-sm:` aditivo sobre classes que já existiam e funcionavam em desktop (nenhuma classe original de `lg`+ foi removida ou trocada).
