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