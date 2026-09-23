# Auditoria do sistema de cores — tela Início (presets dark)

> **Data:** 2026-09-23 · **Escopo:** 5 presets dark de `src/app/styles/index.css` (`.dark` = zinc-minimalist, `indigo`, `slate-cyan`, `github-dimmed`, `contrast-safe-graphite`) e a tela **Início** (`/home`). O tema light (`:root`) ficou fora do escopo.
> **Natureza:** somente diagnóstico. Nenhum arquivo de código foi editado, e este documento ainda não propõe paleta nova.

## Sumário executivo

A sensação de "monocromático / sem vida" tem causa estrutural e é mensurável:

1. **O preset padrão (zinc) não tem nenhuma cor de papel.** `primary` = `foreground` = `chart-1` = `#fafafa` (ΔE00 = 0 entre "ativo" e "texto normal"), `cool` é alias de `primary`, e `warm` = `#d4d4d8` (C = 0.005, um cinza). Os papéis de acento viram branco ou cinza.
2. **Os presets só trocam `primary`.** As superfícies dos 5 presets ficam na mesma faixa de matiz frio (H ≈ 255–286) e com croma médio entre 0.001 e 0.041. Fora o botão primário, a tela fica praticamente igual entre os presets.
3. **Toda a cor "viva" da Início vem de fora do sistema de temas.** São classes Tailwind cruas (`emerald`, `amber`, `sky`, `purple`, `rose`) que não mudam por preset, porque não existem tokens `success`, `warning` e `info`.
4. **Os tiles não se destacam do fundo.** `bg-surface-low` (= `muted`) é a mesma cor do topo do gradiente do `<main>` (`from-muted`), com contraste de 1.00 a 1.41. A única separação vem de `border-subtle`, com contraste de 1.14 a 1.26 em 4 dos 5 presets.
5. **O `contrast-safe-graphite` não cumpre o que o próprio nome promete.** Vários pares falham no WCAG, e um dos números citados no comentário do CSS e no `CLAUDE.md` está errado (8.82:1 citado contra 4.50:1 medido).
6. **A documentação inverte `surface-container` e `surface-high`** em relação ao código. Por isso a regra de "cards dentro do Dialog" produz exatamente o bug que ela tenta proibir.

## Método

- Os tokens foram extraídos de `src/app/styles/index.css` por um script Node com **culori 4** (código completo no [Apêndice A](#apêndice-a--script-de-medição)). Cada preset é resolvido como `.dark` mais os overrides de `.dark[data-theme="…"]`, que é a cascata real, já que o `data-theme` fica no mesmo `<html class="dark">`.
- **Convenção de valores:** OKLCH com L de 0 a 1, C absoluto e H em graus (`—` quando C < 0.002, ou seja, matiz indefinido). Contraste é a razão WCAG 2.x (luminância relativa). Distância perceptual é ΔE00 (CIEDE2000).
- **Daltonismo:** `filterDeficiencyDeuter(1)` e `filterDeficiencyProt(1)` do culori (Machado 2009, severidade total). O limiar de "difícil distinguir" adotado para marcas pequenas de gráfico é ΔE00 < 10.
- **Opacidade (`bg-x/NN`):** composição alpha em sRGB sobre a superfície opaca real onde o elemento aparece.
- O script foi executado **fora do repositório** (scratchpad, com culori instalado localmente) para não alterar `package.json` nem criar arquivo de código. Para versionar, basta copiar o Apêndice A para `frontend/scripts/theme-audit.mjs` e adicionar `culori` como devDependency.
- As cores Tailwind cruas foram conferidas contra `node_modules/tailwindcss/theme.css` (v4).

---

## 1. Mapa da tela Início

| Camada | Arquivo | Papel |
|---|---|---|
| Rota | `src/app/Router.tsx:95-97` | `path: "/home"` → `HomePage` (lazy) dentro de `AppLayout`. `/` redireciona para `/home`. |
| Nav (sidebar) | `src/widgets/layout/nav.types.ts:46-51` | "Início" → `/home` |
| Nav (mobile) | `src/widgets/layout/AppLayout.tsx:39` | ⚠️ "Início" → **`/dashboard`** (divergência, ver §7) |
| Page | `src/pages/home/HomePage.tsx` | Container puro, renderiza `<HomeView />` |
| Widget | `src/widgets/home/HomeView.tsx` | Bento grid de 12 colunas |
| Componentes | `src/widgets/home/components/` | `HomeHeader`, `HomeAlertBanner`, `HomeClockHeroTile`, `HomeSecurityTile`, `HomeDeviceGrid` → `HomeDeviceCard`, `HomeQuickActions`, `HomeMediaTile`, `HomeEnergyTile`, `HomeCameraTile`, `HomeActivityFeed` |
| Hook local | `src/widgets/home/hooks/useHomeProjects.ts` | Sem cor |
| Features consumidas | `features/dashboard` (`useDashboardOverview`, `useActivityLog`, `getRelativeTime`), `features/devices` (`useDevices`, `useToggleDevice`), `features/rooms` (`useRooms`) | Somente dados, sem UI |
| Core UI | `core/components/ui/dropdown-menu.tsx`, `core/components/feedback/CardErrorFallback.tsx` → `ui/button.tsx` (ghost), `core/constants/device-config.ts` (somente `.icon`) | Primitivos |
| Shell | `widgets/layout/AppLayout.tsx:49` | `<main>` com `bg-linear-to-b from-muted to-background`, que é o fundo real atrás dos tiles |
| Aplicação do tema | `index.html:2` (`<html class="dark">`), `index.html:20-22` (anti-FOUC), `features/settings/store/theme-ui.store.ts:28-34` | `data-theme` no `<html>` |

---

## 2. Inventário de tokens

Os valores abaixo são gerados pelo script. A coluna "Origem" indica se o token foi redefinido no preset ou herdado do `.dark`. `cool` não é variável própria: `--color-cool: var(--primary)` (`index.css:54`).

### zinc-minimalist (.dark)

| Token | Hex | L | C | H | Origem |
|---|---|---|---|---|---|
| `background` | `#09090b` | 0.141 | 0.004 | 285.8 | .dark |
| `foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `muted` | `#121215` | 0.184 | 0.006 | 285.8 | .dark |
| `card` | `#18181b` | 0.210 | 0.006 | 285.9 | .dark |
| `card-foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `popover` | `#27272a` | 0.274 | 0.005 | 286.0 | .dark |
| `popover-foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `surface-highest` | `#3f3f46` | 0.370 | 0.012 | 285.8 | .dark |
| `primary` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `primary-foreground` | `#18181b` | 0.210 | 0.006 | 285.9 | .dark |
| `secondary` | `#27272a` | 0.274 | 0.005 | 286.0 | .dark |
| `secondary-foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `muted-foreground` | `#a1a1aa` | 0.712 | 0.013 | 286.1 | .dark |
| `accent` | `#18181b` | 0.210 | 0.006 | 285.9 | .dark |
| `accent-foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `destructive` | `#ef4444` | 0.637 | 0.208 | 25.3 | .dark |
| `destructive-foreground` | *não definido* | | | | ausente |
| `border-subtle` | `#27272a` | 0.274 | 0.005 | 286.0 | .dark |
| `border` | `#3f3f46` | 0.370 | 0.012 | 285.8 | .dark |
| `input` | `#52525b` | 0.442 | 0.015 | 285.8 | .dark |
| `ring` | `#d4d4d8` | 0.871 | 0.005 | 286.3 | .dark |
| `chart-1` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `chart-2` | `#a1a1aa` | 0.712 | 0.013 | 286.1 | .dark |
| `chart-3` | `#71717a` | 0.552 | 0.014 | 285.9 | .dark |
| `chart-4` | `#52525b` | 0.442 | 0.015 | 285.8 | .dark |
| `chart-5` | `#3f3f46` | 0.370 | 0.012 | 285.8 | .dark |
| `sidebar` | `#09090b` | 0.141 | 0.004 | 285.8 | .dark |
| `sidebar-foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `sidebar-primary` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `sidebar-primary-foreground` | `#18181b` | 0.210 | 0.006 | 285.9 | .dark |
| `sidebar-accent` | `#18181b` | 0.210 | 0.006 | 285.9 | .dark |
| `sidebar-accent-foreground` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `sidebar-border` | `#27272a` | 0.274 | 0.005 | 286.0 | .dark |
| `sidebar-ring` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `warm` | `#d4d4d8` | 0.871 | 0.005 | 286.3 | .dark |
| `warm-foreground` | `#18181b` | 0.210 | 0.006 | 285.9 | .dark |
| `cool (=primary)` | `#fafafa` | 0.985 | 0.000 | — | .dark |
| `alert` | `#ef4444` | 0.637 | 0.208 | 25.3 | .dark |
| `alert-foreground` | `#ffffff` | 1.000 | 0.000 | — | .dark |
| `brand-accent` | `#12967a` | 0.602 | 0.112 | 172.8 | .dark |
| `brand-muted` | `#d6d3ce` | 0.868 | 0.008 | 80.7 | .dark |

### indigo

| Token | Hex | L | C | H | Origem |
|---|---|---|---|---|---|
| `background` | `#08090d` | 0.141 | 0.009 | 273.2 | preset |
| `foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `muted` | `#0f1118` | 0.179 | 0.015 | 272.4 | preset |
| `card` | `#151824` | 0.212 | 0.024 | 273.3 | preset |
| `card-foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `popover` | `#1f2334` | 0.260 | 0.033 | 273.7 | preset |
| `popover-foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `surface-highest` | `#2c324b` | 0.323 | 0.045 | 273.3 | preset |
| `primary` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `primary-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `secondary` | `#1f2334` | 0.260 | 0.033 | 273.7 | preset |
| `secondary-foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `muted-foreground` | `#8a92a6` | 0.660 | 0.031 | 268.2 | preset |
| `accent` | `#151824` | 0.212 | 0.024 | 273.3 | preset |
| `accent-foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `destructive` | `#f43f5e` | 0.645 | 0.215 | 16.4 | preset |
| `destructive-foreground` | *não definido* | | | | ausente |
| `border-subtle` | `#1e2233` | 0.256 | 0.033 | 273.7 | preset |
| `border` | `#2e344e` | 0.332 | 0.047 | 273.6 | preset |
| `input` | `#3d4566` | 0.398 | 0.057 | 273.1 | preset |
| `ring` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `chart-1` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `chart-2` | `#38bdf8` | 0.754 | 0.139 | 232.7 | preset |
| `chart-3` | `#34d399` | 0.773 | 0.153 | 163.2 | preset |
| `chart-4` | `#f43f5e` | 0.645 | 0.215 | 16.4 | preset |
| `chart-5` | `#fbbf24` | 0.837 | 0.164 | 84.4 | preset |
| `sidebar` | `#08090d` | 0.141 | 0.009 | 273.2 | preset |
| `sidebar-foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `sidebar-primary` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `sidebar-primary-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `sidebar-accent` | `#151824` | 0.212 | 0.024 | 273.3 | preset |
| `sidebar-accent-foreground` | `#f2f4f8` | 0.967 | 0.006 | 264.5 | preset |
| `sidebar-border` | `#1e2233` | 0.256 | 0.033 | 273.7 | preset |
| `sidebar-ring` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `warm` | `#fde68a` | 0.924 | 0.115 | 95.7 | preset |
| `warm-foreground` | `#1c1917` | 0.216 | 0.006 | 56.0 | preset |
| `cool (=primary)` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `alert` | `#f43f5e` | 0.645 | 0.215 | 16.4 | preset |
| `alert-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `brand-accent` | `#12967a` | 0.602 | 0.112 | 172.8 | herdado de .dark |
| `brand-muted` | `#d6d3ce` | 0.868 | 0.008 | 80.7 | herdado de .dark |

### slate-cyan

| Token | Hex | L | C | H | Origem |
|---|---|---|---|---|---|
| `background` | `#0b0f17` | 0.168 | 0.018 | 263.9 | preset |
| `foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `muted` | `#111827` | 0.210 | 0.032 | 264.7 | preset |
| `card` | `#172033` | 0.245 | 0.039 | 264.4 | preset |
| `card-foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `popover` | `#1f2b45` | 0.292 | 0.051 | 264.6 | preset |
| `popover-foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `surface-highest` | `#2c3c5f` | 0.360 | 0.065 | 264.7 | preset |
| `primary` | `#06b6d4` | 0.715 | 0.126 | 215.2 | preset |
| `primary-foreground` | `#083344` | 0.302 | 0.054 | 229.7 | preset |
| `secondary` | `#1f2b45` | 0.292 | 0.051 | 264.6 | preset |
| `secondary-foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `muted-foreground` | `#94a3b8` | 0.711 | 0.035 | 256.8 | preset |
| `accent` | `#172033` | 0.245 | 0.039 | 264.4 | preset |
| `accent-foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `destructive` | `#f87171` | 0.711 | 0.166 | 22.2 | preset |
| `destructive-foreground` | *não definido* | | | | ausente |
| `border-subtle` | `#1f293d` | 0.281 | 0.040 | 263.6 | preset |
| `border` | `#334155` | 0.372 | 0.039 | 257.3 | preset |
| `input` | `#475569` | 0.446 | 0.037 | 257.3 | preset |
| `ring` | `#06b6d4` | 0.715 | 0.126 | 215.2 | preset |
| `chart-1` | `#06b6d4` | 0.715 | 0.126 | 215.2 | preset |
| `chart-2` | `#3b82f6` | 0.623 | 0.188 | 259.8 | preset |
| `chart-3` | `#10b981` | 0.696 | 0.149 | 162.5 | preset |
| `chart-4` | `#f43f5e` | 0.645 | 0.215 | 16.4 | preset |
| `chart-5` | `#eab308` | 0.795 | 0.162 | 86.0 | preset |
| `sidebar` | `#0b0f17` | 0.168 | 0.018 | 263.9 | preset |
| `sidebar-foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `sidebar-primary` | `#06b6d4` | 0.715 | 0.126 | 215.2 | preset |
| `sidebar-primary-foreground` | `#083344` | 0.302 | 0.054 | 229.7 | preset |
| `sidebar-accent` | `#172033` | 0.245 | 0.039 | 264.4 | preset |
| `sidebar-accent-foreground` | `#f8fafc` | 0.984 | 0.003 | 247.9 | preset |
| `sidebar-border` | `#1f293d` | 0.281 | 0.040 | 263.6 | preset |
| `sidebar-ring` | `#06b6d4` | 0.715 | 0.126 | 215.2 | preset |
| `warm` | `#fed7aa` | 0.901 | 0.073 | 70.7 | preset |
| `warm-foreground` | `#1c1917` | 0.216 | 0.006 | 56.0 | preset |
| `cool (=primary)` | `#06b6d4` | 0.715 | 0.126 | 215.2 | preset |
| `alert` | `#ef4444` | 0.637 | 0.208 | 25.3 | preset |
| `alert-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `brand-accent` | `#12967a` | 0.602 | 0.112 | 172.8 | herdado de .dark |
| `brand-muted` | `#d6d3ce` | 0.868 | 0.008 | 80.7 | herdado de .dark |

### github-dimmed

| Token | Hex | L | C | H | Origem |
|---|---|---|---|---|---|
| `background` | `#0d1117` | 0.176 | 0.014 | 258.4 | preset |
| `foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `muted` | `#161b22` | 0.220 | 0.016 | 256.8 | preset |
| `card` | `#21262d` | 0.267 | 0.015 | 256.8 | preset |
| `card-foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `popover` | `#30363d` | 0.330 | 0.015 | 252.3 | preset |
| `popover-foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `surface-highest` | `#484f58` | 0.425 | 0.017 | 254.7 | preset |
| `primary` | `#2f81f7` | 0.618 | 0.193 | 258.3 | preset |
| `primary-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `secondary` | `#30363d` | 0.330 | 0.015 | 252.3 | preset |
| `secondary-foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `muted-foreground` | `#8b949e` | 0.662 | 0.018 | 250.9 | preset |
| `accent` | `#21262d` | 0.267 | 0.015 | 256.8 | preset |
| `accent-foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `destructive` | `#f85149` | 0.665 | 0.205 | 27.0 | preset |
| `destructive-foreground` | *não definido* | | | | ausente |
| `border-subtle` | `#21262d` | 0.267 | 0.015 | 256.8 | preset |
| `border` | `#30363d` | 0.330 | 0.015 | 252.3 | preset |
| `input` | `#3b434d` | 0.379 | 0.020 | 254.1 | preset |
| `ring` | `#2f81f7` | 0.618 | 0.193 | 258.3 | preset |
| `chart-1` | `#2f81f7` | 0.618 | 0.193 | 258.3 | preset |
| `chart-2` | `#3fb950` | 0.695 | 0.181 | 145.6 | preset |
| `chart-3` | `#d29922` | 0.720 | 0.140 | 79.9 | preset |
| `chart-4` | `#db61a2` | 0.662 | 0.168 | 349.5 | preset |
| `chart-5` | `#a371f7` | 0.661 | 0.193 | 298.1 | preset |
| `sidebar` | `#0d1117` | 0.176 | 0.014 | 258.4 | preset |
| `sidebar-foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `sidebar-primary` | `#2f81f7` | 0.618 | 0.193 | 258.3 | preset |
| `sidebar-primary-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `sidebar-accent` | `#161b22` | 0.220 | 0.016 | 256.8 | preset |
| `sidebar-accent-foreground` | `#e6edf3` | 0.943 | 0.011 | 243.7 | preset |
| `sidebar-border` | `#21262d` | 0.267 | 0.015 | 256.8 | preset |
| `sidebar-ring` | `#2f81f7` | 0.618 | 0.193 | 258.3 | preset |
| `warm` | `#d29922` | 0.720 | 0.140 | 79.9 | preset |
| `warm-foreground` | `#1c1917` | 0.216 | 0.006 | 56.0 | preset |
| `cool (=primary)` | `#2f81f7` | 0.618 | 0.193 | 258.3 | preset |
| `alert` | `#f85149` | 0.665 | 0.205 | 27.0 | preset |
| `alert-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `brand-accent` | `#12967a` | 0.602 | 0.112 | 172.8 | herdado de .dark |
| `brand-muted` | `#d6d3ce` | 0.868 | 0.008 | 80.7 | herdado de .dark |

### contrast-safe-graphite

| Token | Hex | L | C | H | Origem |
|---|---|---|---|---|---|
| `background` | `#09090b` | 0.141 | 0.004 | 285.8 | preset |
| `foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `muted` | `#2b2b2b` | 0.289 | 0.000 | — | preset |
| `card` | `#414141` | 0.375 | 0.000 | — | preset |
| `card-foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `popover` | `#575757` | 0.457 | 0.000 | — | preset |
| `popover-foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `surface-highest` | `#6d6d6d` | 0.535 | 0.000 | — | preset |
| `primary` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `primary-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `secondary` | `#414141` | 0.375 | 0.000 | — | preset |
| `secondary-foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `muted-foreground` | `#acacac` | 0.744 | 0.000 | — | preset |
| `accent` | `#414141` | 0.375 | 0.000 | — | preset |
| `accent-foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `destructive` | `#dc2626` | 0.577 | 0.215 | 27.3 | preset |
| `destructive-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `border-subtle` | `#8c8c8c` | 0.640 | 0.000 | — | preset |
| `border` | `#6d6d6d` | 0.535 | 0.000 | — | preset |
| `input` | `#6d6d6d` | 0.535 | 0.000 | — | preset |
| `ring` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `chart-1` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `chart-2` | `#38bdf8` | 0.754 | 0.139 | 232.7 | preset |
| `chart-3` | `#10b981` | 0.696 | 0.149 | 162.5 | preset |
| `chart-4` | `#dc2626` | 0.577 | 0.215 | 27.3 | preset |
| `chart-5` | `#fbbf24` | 0.837 | 0.164 | 84.4 | preset |
| `sidebar` | `#09090b` | 0.141 | 0.004 | 285.8 | preset |
| `sidebar-foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `sidebar-primary` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `sidebar-primary-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `sidebar-accent` | `#414141` | 0.375 | 0.000 | — | preset |
| `sidebar-accent-foreground` | `#f4f4f5` | 0.967 | 0.001 | — | preset |
| `sidebar-border` | `#6d6d6d` | 0.535 | 0.000 | — | preset |
| `sidebar-ring` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `warm` | `#fbbf24` | 0.837 | 0.164 | 84.4 | preset |
| `warm-foreground` | `#1c1917` | 0.216 | 0.006 | 56.0 | preset |
| `cool (=primary)` | `#5e6ad2` | 0.567 | 0.159 | 275.2 | preset |
| `alert` | `#dc2626` | 0.577 | 0.215 | 27.3 | preset |
| `alert-foreground` | `#ffffff` | 1.000 | 0.000 | — | preset |
| `brand-accent` | `#12967a` | 0.602 | 0.112 | 172.8 | herdado de .dark |
| `brand-muted` | `#d6d3ce` | 0.868 | 0.008 | 80.7 | herdado de .dark |

---

## 3. Métricas por preset

### 3.1 Croma das superfícies e escada de elevação (ΔL OKLCH)

Superfícies consideradas: `background`, `muted` (surface-low), `card` (surface-container), `popover` (surface-high) e `surface-highest`, na ordem da escada real do código.

| Preset | C médio superfícies | C máx | H médio | ΔL bg→muted | ΔL muted→card | ΔL card→popover | ΔL popover→highest | ΔL total |
|---|---|---|---|---|---|---|---|---|
| zinc-minimalist (.dark) | 0.0067 | 0.0119 | 285.9 | 0.043 | 0.027 | 0.064 | 0.096 | 0.230 |
| indigo | 0.0252 | 0.0454 | 273.2 | 0.038 | 0.033 | 0.049 | 0.063 | 0.183 |
| slate-cyan | 0.0407 | 0.0645 | 264.4 | 0.042 | 0.035 | 0.047 | 0.068 | 0.191 |
| github-dimmed | 0.0154 | 0.0175 | 255.8 | 0.044 | 0.046 | 0.063 | 0.095 | 0.248 |
| contrast-safe-graphite | 0.0009 | 0.0044 | 285.8 | 0.148 | 0.086 | 0.081 | 0.078 | 0.394 |

**Leitura:**
- O zinc (0.0067) e o graphite (0.0009) são, na prática, acromáticos. Mesmo o preset "mais colorido" (slate-cyan, 0.041) tem croma de superfície muito baixo, e todos puxam para a mesma família de matiz (≈ 255–286°). As superfícies não carregam identidade própria em nenhum preset.
- **O primeiro degrau útil (`muted → card`) é o menor da escada** em zinc, indigo e slate-cyan (ΔL 0.027–0.035). É justamente o par tile ↔ card interno que a Início usa o tempo todo (§3.3).
- O graphite tem a escada mais aberta (ΔL total 0.394), mas o salto `background → muted` (0.148) é quase o dobro dos degraus seguintes, então a escada fica desbalanceada.

### 3.2 Contraste WCAG

Mínimo usado: 4.5:1 para texto, 3:1 para UI e bordas (1.4.11).

| Par | zinc-minimalist (.dark) | indigo | slate-cyan | github-dimmed | contrast-safe-graphite |
|---|---|---|---|---|---|
| `foreground` vs `background` (mín 4.5) | 19.06 ✅ | 18.07 ✅ | 18.33 ✅ | 16.02 ✅ | 18.10 ✅ |
| `foreground` vs `muted` (mín 4.5) | 17.91 ✅ | 17.12 ✅ | 16.96 ✅ | 14.64 ✅ | 12.88 ✅ |
| `foreground` vs `card` (mín 4.5) | 16.97 ✅ | 16.05 ✅ | 15.55 ✅ | 12.88 ✅ | 9.29 ✅ |
| `foreground` vs `popover` (mín 4.5) | 14.27 ✅ | 14.15 ✅ | 13.47 ✅ | 10.33 ✅ | 6.57 ✅ |
| `foreground` vs `surface-highest` (mín 4.5) | 10.01 ✅ | 11.45 ✅ | 10.46 ✅ | 7.01 ✅ | 4.71 ✅ |
| `muted-foreground` vs `background` (mín 4.5) | 7.76 ✅ | 6.39 ✅ | 7.48 ✅ | 6.15 ✅ | 8.76 ✅ |
| `muted-foreground` vs `muted` (mín 4.5) | 7.30 ✅ | 6.05 ✅ | 6.92 ✅ | 5.62 ✅ | 6.24 ✅ |
| `muted-foreground` vs `card` (mín 4.5) | 6.91 ✅ | 5.68 ✅ | 6.34 ✅ | 4.95 ✅ | 4.50 ❌ |
| `muted-foreground` vs `popover` (mín 4.5) | 5.81 ✅ | 5.00 ✅ | 5.50 ✅ | 3.97 ❌ | 3.18 ❌ |
| `muted-foreground` vs `surface-highest` (mín 4.5) | 4.07 ❌ | 4.05 ❌ | 4.27 ❌ | 2.69 ❌ | 2.28 ❌ |
| `primary-foreground` vs `primary` (mín 4.5) | 16.97 ✅ | 4.70 ✅ | 5.52 ✅ | 3.75 ❌ | 4.70 ✅ |
| `border` vs `card` (mín 3) | 1.70 ❌ | 1.45 ❌ | 1.57 ❌ | 1.25 ❌ | 1.97 ❌ |
| `border-subtle` vs `card` (mín 3) | 1.19 ❌ | 1.12 ❌ | 1.12 ❌ | 1.00 ❌ | 3.04 ✅ |
| `ring` vs `background` (mín 3) | 13.46 ✅ | 4.23 ✅ | 7.90 ✅ | 5.05 ✅ | 4.23 ✅ |
| `warm-foreground` vs `warm` (mín 4.5) | 11.99 ✅ | 14.04 ✅ | 12.92 ✅ | 6.93 ✅ | 10.48 ✅ |
| `alert-foreground` vs `alert` (mín 4.5) | 3.76 ❌ | 3.67 ❌ | 3.76 ❌ | 3.35 ❌ | 4.83 ✅ |
| `destructive` vs `card` (mín 4.5) | 4.71 ✅ | 4.81 ✅ | 5.88 ✅ | 4.54 ✅ | 2.11 ❌ |
| `primary` vs `muted` (mín 3) | 17.91 ✅ | 4.01 ✅ | 7.31 ✅ | 4.62 ✅ | 3.01 ✅ |
| `alert` vs `muted` (mín 3) | 4.97 ✅ | 5.14 ✅ | 4.71 ✅ | 5.16 ✅ | 2.93 ❌ |

> Observação sobre bordas: WCAG 1.4.11 só exige 3:1 quando a borda é o **único** indicador de um componente. Na Início, os tiles e cards internos dependem exclusivamente da borda para se separar do fundo (§3.3), então o critério se aplica na prática.

### 3.3 Combinações reais usadas na Início (tokens com opacidade, composição sobre a superfície real)

| Combinação | zinc-minimalist (.dark) | indigo | slate-cyan | github-dimmed | contrast-safe-graphite |
|---|---|---|---|---|---|
| `text-primary` sobre `bg-primary/15` sobre `surface-container` (botão modo ativo, SecurityTile) | 10.87 ✅ | 3.23 ❌ | 5.16 ✅ | 3.37 ❌ | 1.95 ❌ |
| `text-primary` sobre `bg-primary/10` sobre `surface-container` (badge sensor, DeviceCard) | 12.80 ✅ | 3.42 ❌ | 5.69 ✅ | 3.61 ❌ | 2.02 ❌ |
| `text-primary` sobre `surface-high` (rótulo LIGADO, DeviceCard) | 14.27 ✅ | 3.31 ❌ | 5.81 ✅ | 3.26 ❌ | 1.54 ❌ |
| `text-primary` vs `text-foreground` (ΔE00 — estado ativo × texto normal) | 0.00 | 41.70 | 29.48 | 34.38 | 43.75 |
| `text-alert-foreground` sobre `bg-alert/10` sobre `background` (AlertBanner) | 18.46 ✅ | 18.50 ✅ | 17.72 ✅ | 17.24 ✅ | 18.85 ✅ |
| `text-alert-foreground` vs `text-foreground` (ΔE00 — ícone de alerta × texto) | 1.00 | 3.04 | 1.62 | 5.43 | 2.27 |
| `bg-primary` (switch ligado) vs `surface-low` (switch desligado) — contraste 1.4.11 | 17.91 ✅ | 4.01 ✅ | 7.31 ✅ | 4.62 ✅ | 3.01 ✅ |
| thumb `bg-background` vs trilho `bg-primary` (switch ligado) | 19.06 ✅ | 4.23 ✅ | 7.90 ✅ | 5.05 ✅ | 4.23 ✅ |
| `border-border-subtle` vs `surface-low` (borda dos tiles) | 1.26 ❌ | 1.20 ❌ | 1.22 ❌ | 1.14 ❌ | 4.21 ✅ |
| `bg-surface-container` (card desligado) vs `bg-surface-low` (tile pai) | 1.06 | 1.07 | 1.09 | 1.14 | 1.39 |
| `bg-surface-high` (card ligado) vs `bg-surface-container` (card desligado) | 1.19 | 1.13 | 1.15 | 1.25 | 1.41 |
| `accent` (foco DropdownMenuItem) vs `surface-container` (conteúdo do dropdown no HomeHeader) | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

**Contexto que agrava:** os tiles usam `bg-surface-low` (= `muted`), e o `<main>` usa `from-muted to-background` (`AppLayout.tsx:49`). No topo da página, o tile tem **exatamente** a cor do fundo. No rodapé, o contraste tile × fundo é `muted` vs `background`: **zinc 1.06 · indigo 1.06 · slate-cyan 1.08 · github-dimmed 1.09 · graphite 1.41**.

### 3.4 Tokens que colapsam

#### Mesmo valor dentro do preset (tokens de papel, excluindo `*-foreground` e `sidebar-*`)

- **zinc-minimalist (.dark)**: `#18181b` = `card` = `accent`; `#27272a` = `popover` = `secondary` = `border-subtle`; `#3f3f46` = `surface-highest` = `border` = `chart-5`; `#fafafa` = `primary` = `chart-1`; `#ef4444` = `destructive` = `alert`; `#52525b` = `input` = `chart-4`; `#d4d4d8` = `ring` = `warm`
- **indigo**: `#151824` = `card` = `accent`; `#1f2334` = `popover` = `secondary`; `#5e6ad2` = `primary` = `ring` = `chart-1`; `#f43f5e` = `destructive` = `chart-4` = `alert`
- **slate-cyan**: `#172033` = `card` = `accent`; `#1f2b45` = `popover` = `secondary`; `#06b6d4` = `primary` = `ring` = `chart-1`
- **github-dimmed**: `#21262d` = `card` = `accent` = `border-subtle`; `#30363d` = `popover` = `secondary` = `border`; `#2f81f7` = `primary` = `ring` = `chart-1`; `#f85149` = `destructive` = `alert`; `#d29922` = `chart-3` = `warm`
- **contrast-safe-graphite**: `#414141` = `card` = `secondary` = `accent`; `#6d6d6d` = `surface-highest` = `border` = `input`; `#5e6ad2` = `primary` = `ring` = `chart-1`; `#dc2626` = `destructive` = `chart-4` = `alert`; `#fbbf24` = `chart-5` = `warm`

#### Mesmo papel ou mesmo valor entre presets

- `warm`: 5 valor(es) distinto(s) em 5 presets — zinc-minimalist C=0.005, indigo C=0.115, slate-cyan C=0.073, github-dimmed C=0.140, contrast-safe-graphite C=0.164
- `alert`: 4 valor(es) distinto(s) em 5 presets — zinc-minimalist C=0.208, indigo C=0.215, slate-cyan C=0.208, github-dimmed C=0.205, contrast-safe-graphite C=0.215
- `brand-accent`: 1 valor(es) distinto(s) em 5 presets — zinc-minimalist C=0.112, indigo C=0.112, slate-cyan C=0.112, github-dimmed C=0.112, contrast-safe-graphite C=0.112
- `brand-muted`: 1 valor(es) distinto(s) em 5 presets — zinc-minimalist C=0.008, indigo C=0.008, slate-cyan C=0.008, github-dimmed C=0.008, contrast-safe-graphite C=0.008
- `destructive`: 5 valor(es) distinto(s) em 5 presets — zinc-minimalist C=0.208, indigo C=0.215, slate-cyan C=0.166, github-dimmed C=0.205, contrast-safe-graphite C=0.215
- `primary`: 4 valor(es) distinto(s) em 5 presets — zinc-minimalist C=0.000, indigo C=0.159, slate-cyan C=0.126, github-dimmed C=0.193, contrast-safe-graphite C=0.159

#### Colapsos de papel (não de valor)

| Colapso | Onde | Efeito |
|---|---|---|
| `cool` ≡ `primary` | `@theme inline` (`index.css:54-55`), todos os presets | Os tiles de câmera (`cool`) e mídia (`primary`) recebem o mesmo tratamento. No zinc, os dois são branco. |
| `warm` cinza | zinc (`#d4d4d8`, C 0.005) | Energia e Clima (`text-warm`, `bg-warm/10`, `shadow-warm/5`) viram cinza. `warm` = `ring`. |
| `primary` = `foreground` | zinc | Todo estado "ativo/ligado/selecionado" feito com `text-primary` fica idêntico ao texto comum (ΔE00 = 0). |
| `chart-*` só cinzas | zinc (C médio 0.011) | Nenhuma série é distinguível por matiz. |
| `alert` = `destructive` | zinc, indigo, github-dimmed, graphite | Dois nomes para o mesmo papel. Só o slate-cyan diferencia (`#ef4444` × `#f87171`). |
| `alert-foreground` = `#ffffff` | todos | Não é "cor de alerta" e sim texto sobre alerta. Usado como cor de ícone/texto sobre fundo escuro (§5), faz o alerta ficar branco. |
| `brand-accent` / `brand-muted` | não redefinidos em nenhum preset (só em `.dark` e `:root`) | Idênticos nos 5 presets, portanto a marca não acompanha o tema. |
| `border-subtle` **mais claro** que `border` | graphite (`#8c8c8c` L 0.640 × `#6d6d6d` L 0.535) | Nome invertido em relação ao valor: a borda "sutil" é a mais forte. |

### 3.5 `chart-1..5` sob simulação de daltonismo

| Preset | C médio chart | ΔE00 mín (normal) | par | ΔE00 mín (deuteranopia) | par | ΔE00 mín (protanopia) | par | chart vs card (WCAG mín) |
|---|---|---|---|---|---|---|---|---|
| zinc-minimalist (.dark) | 0.011 | 6.5 | 4×5 | 6.5 | 4×5 | 6.6 | 4×5 | 1.70 |
| indigo | 0.166 | 30.1 | 1×2 | 16.2 | 1×2 | 18.0 | 3×5 | 3.76 |
| slate-cyan | 0.168 | 25.5 | 1×2 | 7.4 | 1×2 | 12.7 | 1×2 | 4.42 |
| github-dimmed | 0.175 | 19.7 | 1×5 | 7.2 | 1×5 | 0.2 | 1×5 | 4.06 |
| contrast-safe-graphite | 0.165 | 30.1 | 1×2 | 16.2 | 1×2 | 20.2 | 3×5 | 2.11 |

- zinc-minimalist (.dark): 4×5 deut 6.5, 4×5 prot 6.6
- indigo: nenhum par < 10
- slate-cyan: 1×2 deut 7.4
- github-dimmed: 1×5 deut 7.2, 1×5 prot 0.2, 2×3 prot 5.8
- contrast-safe-graphite: nenhum par < 10

**Leitura:**
- **zinc:** 5 cinzas, ΔE00 mínimo de 6.5 mesmo com visão normal. `chart-5` vs `card` = 1.70:1, ou seja, a série 5 some sobre o card.
- **github-dimmed:** `chart-1` (`#2f81f7`) × `chart-5` (`#a371f7`) fica com **ΔE00 = 0.2 sob protanopia**, indistinguível. `chart-2` × `chart-3` (verde × âmbar) = 5.8.
- **slate-cyan:** `chart-1` × `chart-2` (ciano × azul) = 7.4 sob deuteranopia.
- **indigo / graphite:** passam no limiar de 10. No graphite, porém, `chart-4` (`#dc2626`) vs `card` = 2.11:1.
- A Início **não usa `chart-*`**. A barra de carga do `HomeEnergyTile` usa `amber-400` / `primary` / `sky-400` hardcoded (§5).

### 3.6 `contrast-safe-graphite` é tratado como `.dark`?

**Sim, por construção.** O `index.html:2` fixa `<html class="dark">`, e o `data-theme` é aplicado no mesmo elemento (`theme-ui.store.ts:28-34`, `index.html:20-22`). O seletor `.dark[data-theme="contrast-safe-graphite"]` (`index.css:327`) é composto e herda de `.dark` tudo que não redefine (`color-scheme: dark`, `--radius`, `--brand-accent`, `--brand-muted`). O `@custom-variant dark (&:is(.dark *))` também vale para ele.

**É intencional?** A intenção de ser um preset dark é explícita: está listado em `THEME_PRESET_OPTIONS`, na tabela de presets do `frontend/CLAUDE.md` e tem `background: #09090b`. Não existe caminho para o modo claro, já que `.dark` é fixo e o `:root` nunca fica ativo sozinho. O que **não se sustenta** é a promessa "contrast-safe":

| Afirmação (comentário `index.css:316-326` e `frontend/CLAUDE.md`) | Medido | |
|---|---|---|
| `background → card` 1.96:1 | 1.95 | ✅ |
| `background → popover` 2.74:1 | 2.75 | ✅ |
| `background → surface-highest` 3.84:1 | 3.85 | ✅ |
| `border-subtle` vs `card` 3.00:1 | 3.04 | ✅ |
| **`muted-foreground` vs `card` 8.82:1** | **4.50** (8.76 é contra `background`) | ❌ número errado |
| `primary-foreground` vs `primary` 4.70:1 | 4.70 | ✅ |
| `destructive-foreground` vs `destructive` 4.83:1 | 4.83 | ✅ (mas o token não é mapeado em `@theme inline`, ver §4) |

Falhas que o comentário não cobre: `muted-foreground` vs `popover` 3.18, vs `surface-highest` 2.28; `destructive` vs `card` 2.11; `alert` vs `muted` 2.93; `text-primary` sobre `surface-high` 1.54; `text-primary` sobre `bg-primary/15` 1.95. As superfícies foram clareadas para atingir as razões `background → X`, e com isso o texto colorido sobre essas superfícies perdeu contraste.

---

## 4. Semântica dos nomes

| Token | Classificação | Papel declarado | Observação |
|---|---|---|---|
| `background`, `foreground` | Semântico (shadcn) | Fundo e texto base | OK |
| `card`, `popover` (+ `-foreground`) | Semântico (shadcn) | Superfícies de componente | Reaproveitados como degraus de elevação (`surface-container` / `surface-high`) |
| `muted`, `muted-foreground` | Semântico (shadcn) | Fundo atenuado e texto secundário | `muted` também é `surface-low` |
| `primary` (+ `-foreground`) | Semântico (shadcn) | Ação principal | Na Início acumula também os papéis de "ativo", "selecionado", "ligado", "decoração" e "categoria Luzes" (§5) |
| `secondary` (+ `-foreground`) | Semântico (shadcn) | Ação secundária | = `popover` em todos os presets |
| `accent` (+ `-foreground`) | Semântico (shadcn) | **Fundo de hover/foco** de itens ghost/menu | = `card` em todos os presets, ver abaixo |
| `destructive` | Semântico (shadcn) | Ação destrutiva | = `alert` em 4 presets |
| `destructive-foreground` | Semântico (shadcn v3) | Texto sobre destructive | **Ausente em 4 presets e não mapeado em `@theme inline`.** `text-destructive-foreground` (`ConfirmDialogProvider.tsx:113`, `history.constants.ts:64`) não gera utilidade. Fora da Início. |
| `border`, `input`, `ring` | Semântico (shadcn) | Borda, campo e foco | OK |
| `chart-1..5` | Semântico (shadcn) | Séries de gráfico | Não usados na Início |
| `sidebar-*` | Semântico (shadcn) | Shell | Fora do foco da Início |
| `surface-low/-container/-high/-highest` | Semântico (projeto), aliases | Escada de elevação | Nomes bons, mas a documentação diverge do mapeamento (§7) |
| `border-subtle` | Semântico (projeto) | Divisor fraco | Mais claro que `border` no graphite |
| `alert` (+ `-foreground`) | Semântico (projeto) | Alerta ativo | Duplica `destructive`. O `-foreground` é usado como cor de ícone. |
| `warm`, `cool` | **Não-semântico** (temperatura) | Não há papel definido | `cool` é alias de `primary`. `warm` varia de cinza (zinc) a âmbar (graphite), então o papel muda conforme o preset. |
| `brand-accent`, `brand-muted` | **Não-semântico** (marca) | Marca | Idênticos em todos os presets. Usados só em `core/components/brand/*` e `AuthLayout`. |
| `success`, `warning`, `info` | **Ausente** | — | A Início supre com `emerald-*`, `amber-*` e `sky-*` crus (§5) |

**Uso de `--accent`:** na Início nenhum componente usa `bg-accent` / `text-accent` como cor de marca, então não há uso indevido direto. `accent-primary` em `HomeMediaTile.tsx:154` é o `accent-color` do CSS (cor do `<input type="range">`), não o token shadcn. O problema está no **valor**: `accent` = `card` em todos os presets, e o `HomeHeader.tsx:78` põe o `DropdownMenuContent` em `bg-surface-container` (= `card`). Com isso, o `focus:bg-accent` do `DropdownMenuItem` (`dropdown-menu.tsx:74`) tem contraste de **1.00** contra o próprio menu, e o item em foco/hover fica invisível.

---

## 5. Uso real de cor na Início

Legenda de papel: **S** sucesso · **W** aviso · **I** info · **A** alerta · **Ac** acento/ativo · **C** categórico · **D** decoração.
Coluna "Só cor?": ⚠️ indica estado comunicado apenas por cor (ou cor + peso de fonte), sem ícone, texto ou atributo ARIA.

### 5.1 Cores fora do sistema de temas (hardcoded; não mudam com o preset)

| Arquivo:linha | Cor | Papel | Só cor? | Nota |
|---|---|---|---|---|
| `HomeHeader.tsx:115-116` | `bg-emerald-400` (ping), `bg-emerald-500` | S (online) | — | Acompanhado do texto "Online" |
| `HomeClockHeroTile.tsx:58-59` | `bg-emerald-400`, `bg-emerald-500` | S (rede ativa) | — | Texto "Rede Residencial Ativa" |
| `HomeClockHeroTile.tsx:66` | `text-emerald-400` (Wifi) | S / D | — | Dado mock "12ms" |
| `HomeClockHeroTile.tsx:102` | `text-sky-400` (Droplets) | I / D | — | Umidade |
| `HomeSecurityTile.tsx:41` / `:43` | `text-emerald-400` / `text-amber-400` | S / W | — | O formato do ícone também muda (ShieldCheck × ShieldAlert) |
| `HomeSecurityTile.tsx:54-55` | badge `emerald-500/30`, `/10`, `-400` × `amber-*` | S / W | — | Texto "Armado" / "Desarmado" |
| `HomeSecurityTile.tsx:89` | `border-amber-500/40 bg-amber-500/15 text-amber-300` | W (modo selecionado) | ⚠️ | Seleção indicada só por cor + `font-semibold`, sem `aria-pressed` |
| `HomeSecurityTile.tsx:117` | `border-sky-500/40 bg-sky-500/15 text-sky-400` | I (modo selecionado) | ⚠️ | Idem |
| `HomeQuickActions.tsx:57-63` | `text-purple-400`, `text-amber-400`, `text-sky-400`, `text-rose-400` | C (ícone por cena) | — | `rose-400` é flagado pelo `lint:tokens` |
| `HomeEnergyTile.tsx:29` | `text-emerald-400` (TrendingDown "-8%") | S (queda de consumo) | — | Ícone + texto |
| `HomeEnergyTile.tsx:69,83` | `bg-amber-400` | C (Clima) | — | Existe legenda com texto |
| `HomeEnergyTile.tsx:77,91` | `bg-sky-400` | C (Outros) | — | Idem |
| `HomeCameraTile.tsx:40-42` | badge `emerald-500/30`, `/10`, `-400` "LIVE" | S | — | Texto "LIVE" |
| `HomeCameraTile.tsx:55` | `rgba(255,255,255,0.08)` inline (scanlines) | D | — | Estilo inline, fora do alcance do lint |
| `HomeCameraTile.tsx:66,71` | `bg-black/60 text-white/90` | D (HUD sobre vídeo) | — | Legítimo sobre vídeo, mas sem token |
| `HomeCameraTile.tsx:72` | `bg-emerald-400` (ponto) | S | — | Texto "Sem movimento recente" |
| `HomeCameraTile.tsx:80` | `bg-black/60 text-white/80 hover:bg-black/80 hover:text-white` | D | — | Flagado pelo `lint:tokens` (`text-white`) |

Contraste dessas cores contra `surface-low` (todas passam em 4.5:1; o problema delas é identidade, não legibilidade):

| Cor Tailwind | Hex | L | C | H | contraste vs `surface-low` (zinc / indigo / slate / github / graphite) |
|---|---|---|---|---|---|
| `emerald-400` | `#00d492` | 0.765 | 0.177 | 163.2 | 9.55 / 9.64 / 9.06 / 8.84 / 7.23 |
| `emerald-500` | `#00bc7d` | 0.696 | 0.170 | 162.5 | 7.44 / 7.50 / 7.06 / 6.88 / 5.64 |
| `amber-300` | `#ffd230` | 0.879 | 0.169 | 91.6 | 12.96 / 13.06 / 12.29 / 11.99 / 9.81 |
| `amber-400` | `#ffb900` | 0.828 | 0.189 | 84.4 | 10.84 / 10.93 / 10.28 / 10.02 / 8.21 |
| `sky-400` | `#00bcff` | 0.746 | 0.160 | 232.7 | 8.52 / 8.59 / 8.08 / 7.88 / 6.45 |
| `purple-400` | `#c27aff` | 0.714 | 0.203 | 305.5 | 6.78 / 6.84 / 6.44 / 6.28 / 5.14 |
| `rose-400` | `#ff637e` | 0.712 | 0.194 | 13.4 | 6.68 / 6.74 / 6.34 / 6.18 / 5.06 |

### 5.2 Cores via token (mudam com o preset)

| Arquivo:linha | Classe | Papel | Só cor? | Nota |
|---|---|---|---|---|
| `HomeHeader.tsx:69` | `hover:text-primary` | Ac (hover) | — | No zinc, `primary` = `foreground`, então o hover não aparece |
| `HomeHeader.tsx:88` | `text-primary` (Check) | Ac (selecionado) | — | Ícone de check |
| `HomeHeader.tsx:119`, `HomeClockHeroTile.tsx:64` | `text-border-subtle` (bullet "•") | D | — | Token de borda usado como cor de texto |
| `HomeAlertBanner.tsx:31` | `border-alert/40 bg-alert/10 hover:bg-alert/15` | A | — | Ícone + texto |
| `HomeAlertBanner.tsx:34-46,55` | `bg-alert/20`, `bg-alert`, `text-alert-foreground` (+ `/80`) | A | — | O texto do alerta é **branco** (`alert-foreground`). Só o tint de fundo é vermelho. |
| `HomeClockHeroTile.tsx:50` | `border-primary/15` | Ac (hero) | — | O comentário fala em "borda tingida de --primary", mas no zinc ela é cinza |
| `HomeClockHeroTile.tsx:52` | `bg-primary/8 blur-3xl` | D (glow) | — | No zinc, um borrão cinza |
| `HomeClockHeroTile.tsx:90` | `text-warm` (CloudSun) | Ac / D | — | No zinc, cinza |
| `HomeClockHeroTile.tsx:106` | `text-cool` (Wind) | Ac / D | — | = `primary` |
| `HomeClockHeroTile.tsx:117,123` | `text-primary` | Ac | — | |
| `HomeSecurityTile.tsx:35`, `HomeMediaTile.tsx:69` | `hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5` | D (glow hover) | — | |
| `HomeSecurityTile.tsx:39,68`, `HomeMediaTile.tsx:73-74,88-92` | `bg-primary/10`, `text-primary` | Ac / D | — | Ícone de cabeçalho |
| `HomeSecurityTile.tsx:103` | `border-primary/40 bg-primary/15 text-primary` | Ac (modo selecionado) | ⚠️ | Sem `aria-pressed`. Contraste 3.23 (indigo), 3.37 (github), 1.95 (graphite). |
| `HomeDeviceGrid.tsx:115,127` | `bg-surface-high` (+ `text-primary` no "Ligados") | Ac (filtro selecionado) | ⚠️ | Sem `aria-pressed`. No zinc, diferença de 1.19 entre selecionado e não selecionado. |
| `HomeDeviceGrid.tsx:137` | `hover:text-primary` | Ac (hover link) | — | |
| `HomeDeviceCard.tsx:105` | `opacity-60 grayscale-[0.3]` | Estado offline | — | Texto "OFFLINE" |
| `HomeDeviceCard.tsx:107-108` | `bg-surface-high` (ligado) × `bg-surface-container` (desligado) | Ac (ligado) | — | Contraste entre os dois: 1.13–1.41. O rótulo de texto salva. |
| `HomeDeviceCard.tsx:119` | `bg-primary/20 text-primary border-primary/30` | Ac (ligado) | — | |
| `HomeDeviceCard.tsx:141` | `bg-primary` (switch) | Ac (ligado) | — | `role="switch"` + `aria-checked`. Contraste do trilho OK. |
| `HomeDeviceCard.tsx:158` | `bg-primary/10 text-primary border-primary/20` | Ac (sensor ativo) | — | Contraste 3.42 (indigo), 3.61 (github), 2.02 (graphite) |
| `HomeDeviceCard.tsx:169` | `group-hover:text-primary` | Ac (hover) | — | |
| `HomeDeviceCard.tsx:187` | `text-primary` (LIGADO) | Ac | — | Contra `surface-high`: 3.31 (indigo), 3.26 (github), **1.54** (graphite) |
| `HomeQuickActions.tsx:65,73,114` | `text-primary`, `group-hover:text-primary` | Ac / D | — | |
| `HomeQuickActions.tsx:99,107` | `border-primary bg-primary/20`, `bg-primary/30` | Ac (executando) | — | Texto "Acionando..." |
| `HomeMediaTile.tsx:81` | `bg-primary animate-pulse` | S (cast ativo) | — | O papel é "sucesso/ao vivo", mas foi feito com `primary` (em outros tiles, o mesmo papel usa emerald) |
| `HomeMediaTile.tsx:104` | `text-primary/90` | D | — | |
| `HomeMediaTile.tsx:125` | `border-primary/30 bg-primary/20 text-primary hover:bg-primary/30` | Ac (play) | — | |
| `HomeMediaTile.tsx:154` | `accent-primary` | Ac | — | CSS `accent-color` |
| `HomeEnergyTile.tsx:18,22-23` | `hover:border-warm/30 hover:shadow-warm/5`, `bg-warm/10`, `text-warm` | Ac / D | — | No zinc, cinza |
| `HomeEnergyTile.tsx:73,87` | `bg-primary` | **C (Luzes)** | — | `primary` usado como cor categórica. No zinc, branco. |
| `HomeCameraTile.tsx:29,33-34` | `hover:border-cool/30 hover:shadow-cool/5`, `bg-cool/10`, `text-cool` | Ac / D | — | = `primary` |
| `HomeActivityFeed.tsx:26` | `text-alert-foreground` (AlertTriangle) | A | — | **Ícone de alerta branco.** ΔE00 1.0–5.4 contra `foreground`. A distinção fica no formato do ícone e no `bg-alert/15`. |
| `HomeActivityFeed.tsx:32` | `text-primary` (Bot) | C (automação) | — | Categoria detectada por substring "automação" no título |
| `HomeActivityFeed.tsx:67` | `border-alert/30 bg-alert/15` | A | — | |

**Contagem de papéis na Início:**
- `primary` acumula 6 papéis: ação, ativo/ligado, selecionado, hover, decoração/glow e categoria (Luzes / automação).
- "Sucesso/ao vivo" aparece de duas formas: `emerald-*` (6 lugares) e `primary` (`HomeMediaTile.tsx:81`).
- Aviso e info não têm token.
- `DEVICE_CONFIG` (`core/constants/device-config.ts`) já tem uma paleta categórica por tipo de dispositivo, mas o `HomeDeviceCard` só usa `.icon` e pinta todos os ícones com `primary`.

---

## 6. Estados interativos na Início

| Estado | Técnica em uso | Onde | Problema |
|---|---|---|---|
| **Hover** (superfície) | Degrau de superfície: `bg-surface-container` → `hover:bg-surface-high` (ou `/60`, `/40`) | Botões do SecurityTile, controles do MediaTile, QuickActions, DeviceCard desligado, "Gerenciar dispositivos", itens do ActivityFeed (`hover:bg-surface-high/40`) | Contraste entre os degraus de 1.13–1.25 (fora do graphite). Com `/40` e `/60`, fica menor ainda. Hover quase imperceptível. |
| **Hover** (borda) | `border-border-subtle` → `hover:border-border` | DeviceCard, QuickActions | OK como reforço |
| **Hover** (texto) | `text-muted-foreground` → `hover:text-foreground` ou `hover:text-primary` | Links "Ver todos", "Ver automações", "Ver tudo", filtros, dropdown | No zinc, `hover:text-primary` = `hover:text-foreground` |
| **Hover** (glow) | `hover:border-{primary,warm,cool}/30 hover:shadow-lg hover:shadow-{…}/5` | SecurityTile, MediaTile, EnergyTile, CameraTile | Dentro da regra (< 0.3). No zinc, é glow cinza e só tem efeito nos presets com `primary` cromático. |
| **Hover** (hardcoded) | `hover:bg-black/80 hover:text-white` | CameraTile | Fora do sistema |
| **Hover** (dropdown) | `focus:bg-accent` (shadcn) | Itens do seletor de projeto (HomeHeader) | **Invisível**: `accent` = `card` = fundo do menu (1.00:1) |
| **Selecionado** | Tint `bg-{x}/15` + `border-{x}/40` + `text-{x}` + `font-semibold` | Modos do SecurityTile (amber / primary / sky), filtros do DeviceGrid (`bg-surface-high`) | Sem `aria-pressed`. Estado comunicado só por cor e peso. `text-primary` sobre o tint falha em 4.5:1 em 3 presets. |
| **Ativo/ligado** | `bg-primary` (switch), `bg-surface-high` + ícone `primary/20` + rótulo de texto (card) | DeviceCard | OK graças ao `aria-checked` e ao rótulo de texto |
| **Pressionado** (`:active`) | Só `active:translate-y-px` do `Button` base (usado apenas pelo `CardErrorFallback`). `scale-[0.98]` no QuickActions é estado JS "executando", não `:active`. | — | Nenhum feedback de pressão nos botões nativos da Início |
| **Foco** | `focus-visible:ring-2 focus-visible:ring-ring` | Trigger do HomeHeader, botão do AlertBanner, DeviceCard, switch | OK |
| **Foco** (implícito) | Nenhum. Cai no `outline` do UA com `outline-ring/50` de `@layer base` (`index.css:378`) | Botões do SecurityTile, QuickActions, filtros do DeviceGrid, controles do MediaTile, botão do CameraTile, todos os `<Link>`, range de volume | Inconsistente. Com `ring` = `primary` a 50%, o contraste do foco depende do preset. |
| **Desabilitado** | `disabled:cursor-not-allowed` (switch). Offline via `opacity-60 grayscale-[0.3]` no card. `Button` base: `disabled:opacity-50`. | DeviceCard | O switch desabilitado não tem mudança visual, só de cursor (invisível no touch) |
| **Carregando** | `animate-pulse` em `bg-surface-container` | DeviceGridSkeleton | OK |

---

## 7. Divergências documentação × código

Mapeamento real (`index.css:47-50`): **`surface-low` = `muted` · `surface-container` = `card` · `surface-high` = `popover` · `surface-highest` = `surface-highest`**.
ΔL confirma a ordem crescente `muted < card < popover < surface-highest` em todos os presets (§3.1).

| Fonte | Trecho | Status |
|---|---|---|
| `frontend/CLAUDE.md`, nota no topo de "UI/UX & Design System" | `surface-container: var(--card)`, `surface-high: var(--popover)` | ✅ bate com o código |
| `frontend/CLAUDE.md`, "Contraste de superfície (elevação)" | "`background`/`muted` (surface-low) → **`popover` (surface-container)** → **`card` (surface-high)**" | ❌ invertido |
| `frontend/CLAUDE.md`, mesmo parágrafo | "Dialog já nasce em `bg-popover` (surface-container) — cards internos devem ser `bg-surface-high`" | ❌ No código, `surface-high` = `popover`, então a regra coloca o card **no mesmo nível** do Dialog, que é justamente o que ela proíbe. Seguindo o código, o `bg-surface-container` (= `card`) fica **mais escuro** que o Dialog. |
| `frontend/docs/ui-and-design-system.md:5-10` | Aliases | ✅ |
| `frontend/docs/ui-and-design-system.md:117` | Mesma escada invertida do `CLAUDE.md` | ❌ |
| `frontend/docs/ui-and-design-system.md:119` | Mesma regra do Dialog | ❌ |
| `frontend/docs/ui-and-design-system.md:168-169` | "`bg-surface-container` dentro de um Dialog (`bg-popover` = mesmo valor)" | ❌ `surface-container` = `card` ≠ `popover`. A correção "`bg-surface-high`" registrada na tabela é que produz o mesmo valor do Dialog. |
| `.claude/rules/frontend-fsd.md` | Não menciona superfícies nem cores | ⚪ Sem divergência, mas é lacuna: a regra carregada automaticamente não cobre o design system |
| `frontend/CLAUDE.md` + `index.css:321` | graphite "`muted-foreground` vs `card` 8.82:1" | ❌ medido 4.50 (8.76 é contra `background`) |
| `frontend/CLAUDE.md`, regra de preset | "cada preset redefine o conjunto completo (`background` até `sidebar-ring`, `warm`, `alert`)" | ⚠️ Cumprido para esse intervalo, mas nenhum preset redefine `brand-accent` / `brand-muted`, e só o graphite define `destructive-foreground` |
| `frontend/CLAUDE.md`, KPIs | Cita `text-alert-foreground` como "cor de destaque" | ⚠️ No dark, `alert-foreground` = `#ffffff`, então o KPI "de alerta" fica branco |
| `frontend/CLAUDE.md`, "Paleta Oficial" (zinc) | Valores de `background` … `alert-foreground` | ✅ todos batem |
| `frontend/CLAUDE.md`, tabela de presets | Primárias | ✅ todas batem |
| `AppLayout.tsx:39` × `nav.types.ts:49` | "Início" no mobile → `/dashboard`, na sidebar → `/home` | ❌ Fora do tema, mas afeta o escopo "tela Início" |

---

## 8. Achados priorizados

### 🔴 Quebra identidade ou contraste

| # | Achado | Evidência |
|---|---|---|
| R1 | **O preset padrão (zinc) não tem cor de papel.** `primary` = `foreground` = `chart-1` = `sidebar-primary` = `#fafafa`, `cool` ≡ `primary`, `warm` = `ring` = `#d4d4d8` (C 0.005). Todo acento, estado ativo e glow da Início fica branco ou cinza. | §3.4, ΔE00(`primary`, `foreground`) = 0 |
| R2 | **Os presets não têm identidade de superfície.** Croma médio de 0.001–0.041, todos em H ≈ 255–286. A diferença entre presets se resume a `primary`. | §3.1 |
| R3 | **Os tiles se fundem ao fundo.** `bg-surface-low` = `from-muted` do `<main>` (1.00 no topo, 1.06–1.09 no rodapé, fora o graphite). `border-subtle` vs `surface-low`: 1.14–1.26. Card ligado × desligado: 1.13–1.25. | §3.3 |
| R4 | **A cor viva da Início é hardcoded e ignora o preset.** `emerald`, `amber`, `sky`, `purple` e `rose` em 16+ pontos. Não existem tokens `success`, `warning` e `info`. Trocar de preset não altera nada disso. | §5.1 |
| R5 | **`text-primary` sobre tints e superfícies falha em 3 presets.** No indigo e no github-dimmed, 3.23–3.61. No graphite, 1.54–2.02 (rótulo "LIGADO", modo "Casa", badge "Ativo"). | §3.3 |
| R6 | **O graphite não é "contrast-safe".** `muted-foreground` vs `popover` 3.18 e vs `highest` 2.28; `destructive` vs `card` 2.11; `alert` vs `muted` 2.93. O número 8.82:1 da documentação está errado (4.50). | §3.6 |
| R7 | **O github-dimmed falha no botão primário.** `primary-foreground` vs `primary` = 3.75. `chart-1` × `chart-5` com ΔE00 0.2 sob protanopia. | §3.2, §3.5 |
| R8 | **O alerta não é vermelho.** `alert-foreground` (`#fff`) vs `alert` fica em 3.35–3.76 em 4 presets, e o ícone de alerta do `HomeActivityFeed.tsx:26` é branco (ΔE00 1–5 contra o texto normal). | §3.2, §5.2 |
| R9 | **O foco e o hover do dropdown do HomeHeader são invisíveis.** `accent` = `card` = `surface-container` do menu (1.00:1). | §4 |

### 🟡 Inconsistência

| # | Achado | Evidência |
|---|---|---|
| Y1 | A documentação inverte `surface-container` e `surface-high` (`frontend/CLAUDE.md` e `ui-and-design-system.md:117,119,168-169`). A regra do Dialog leva ao bug que ela proíbe. | §7 |
| Y2 | Colapsos de valor em todos os presets: `accent` = `card`, `secondary` = `popover`, `chart-1` = `primary`, `alert` = `destructive` (4 presets), `border-subtle` = `popover` (zinc) ou = `card` (github), `warm` = `chart-*` (github, graphite). | §3.4 |
| Y3 | `brand-accent` e `brand-muted` são idênticos nos 5 presets e nunca são redefinidos. | §3.4 |
| Y4 | Papel de `warm` instável: cinza (zinc), amarelo-claro (indigo), pêssego (slate), âmbar (github, graphite). | §3.4 |
| Y5 | `chart-*` não é usado na Início. A barra de energia usa `amber-400` / `primary` / `sky-400`. O zinc tem charts só em cinza (ΔE00 mínimo 6.5, `chart-5` vs `card` 1.70). | §3.5, §5 |
| Y6 | Seleção comunicada só por cor (+ peso), sem `aria-pressed`: modos do SecurityTile e filtros do DeviceGrid. | §5, §6 |
| Y7 | Foco inconsistente: cerca de 7 grupos de controles sem `focus-visible:ring`, dependendo do outline do UA. | §6 |
| Y8 | `muted-foreground` vs `surface-highest` falha nos 5 presets (2.28–4.27). | §3.2 |
| Y9 | `border` vs `card` < 3:1 nos 5 presets. `border-subtle` vs `card` < 3:1 em 4. | §3.2 |
| Y10 | No graphite, `border-subtle` é mais claro que `border` (nome invertido). | §3.4 |
| Y11 | `destructive-foreground` não está mapeado em `@theme inline`. As classes `text-destructive-foreground` (2 arquivos fora da Início) não geram CSS. | §4 |
| Y12 | O "Início" do mobile aponta para `/dashboard`. O `HomeDeviceCard` também navega para `/dashboard` (TODO). | §7 |
| Y13 | "Sucesso/ao vivo" aparece com duas cores: `emerald` (Header, Clock, Camera, Energy) e `primary` (Media "Cast Ativo"). | §5 |
| Y14 | `primary` usado como cor categórica ("Luzes" no EnergyTile, "automação" no ActivityFeed). | §5.2 |

### 🔵 Cosmético

| # | Achado | Evidência |
|---|---|---|
| B1 | `text-border-subtle` usado como cor de texto (bullets). | `HomeHeader.tsx:119`, `HomeClockHeroTile.tsx:64` |
| B2 | Glows `shadow-{primary,warm,cool}/5` e `bg-primary/8 blur-3xl` ficam cinza no zinc. | §5.2 |
| B3 | O HUD da câmera usa `bg-black/60` / `text-white` e scanline em `rgba` inline, fora do sistema e parcialmente fora do alcance do lint. | `HomeCameraTile.tsx:55,66,71,80` |
| B4 | Ícones categóricos das cenas em cores cruas (`rose-400` é flagado pelo `lint:tokens`). | `HomeQuickActions.tsx:57-63` |
| B5 | A paleta categórica de `DEVICE_CONFIG` é ignorada no `HomeDeviceCard`, e todos os ícones ficam `primary`. | `HomeDeviceCard.tsx:31,119` |
| B6 | No slate-cyan, `chart-1` × `chart-2` fica em 7.4 sob deuteranopia. | §3.5 |
| B7 | O switch desabilitado não tem sinal visual além do cursor. | `HomeDeviceCard.tsx:139` |

---

## Apêndice A — script de medição

Execução: `node theme-audit.mjs frontend/src/app/styles/index.css > out.md` (requer `culori@4`).

```js
// Auditoria de tokens dos presets dark de frontend/src/app/styles/index.css.
// Uso: node theme-audit.mjs <caminho/index.css>  → imprime markdown no stdout.
import { readFileSync } from "node:fs";
import {
	converter,
	differenceCiede2000,
	filterDeficiencyDeuter,
	filterDeficiencyProt,
	formatHex,
	parse,
	wcagContrast,
} from "culori";

const css = readFileSync(process.argv[2], "utf-8");
const toOklch = converter("oklch");
const toRgb = converter("rgb");
const dE = differenceCiede2000();
const deuter = filterDeficiencyDeuter(1);
const prot = filterDeficiencyProt(1);

function block(selector) {
	const i = css.indexOf(`${selector} {`);
	if (i < 0) throw new Error(`selector ausente: ${selector}`);
	const body = css.slice(i, css.indexOf("}", i));
	const vars = {};
	for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
	return vars;
}

const base = block(".dark");
const PRESETS = {
	"zinc-minimalist (.dark)": { ...base },
	indigo: { ...base, ...block('.dark[data-theme="indigo"]') },
	"slate-cyan": { ...base, ...block('.dark[data-theme="slate-cyan"]') },
	"github-dimmed": { ...base, ...block('.dark[data-theme="github-dimmed"]') },
	"contrast-safe-graphite": { ...base, ...block('.dark[data-theme="contrast-safe-graphite"]') },
};
const OWN = {
	indigo: block('.dark[data-theme="indigo"]'),
	"slate-cyan": block('.dark[data-theme="slate-cyan"]'),
	"github-dimmed": block('.dark[data-theme="github-dimmed"]'),
	"contrast-safe-graphite": block('.dark[data-theme="contrast-safe-graphite"]'),
};

const TOKENS = [
	"background", "foreground", "muted", "card", "card-foreground", "popover",
	"popover-foreground", "surface-highest", "primary", "primary-foreground",
	"secondary", "secondary-foreground", "muted-foreground", "accent",
	"accent-foreground", "destructive", "destructive-foreground", "border-subtle",
	"border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
	"sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
	"sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
	"warm", "warm-foreground", "cool (=primary)", "alert", "alert-foreground",
	"brand-accent", "brand-muted",
];
const get = (p, t) => (t === "cool (=primary)" ? p.primary : p[t]);

const f = (n, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const lch = (hex) => {
	const c = toOklch(parse(hex));
	return { L: c.l, C: c.c, H: c.h };
};
const cr = (a, b) => wcagContrast(parse(a), parse(b));
// Tailwind v4 `bg-x/NN` sobre superfície opaca: composição alpha em sRGB.
function over(fg, alpha, bg) {
	const a = toRgb(parse(fg));
	const b = toRgb(parse(bg));
	return formatHex({ mode: "rgb", r: a.r * alpha + b.r * (1 - alpha), g: a.g * alpha + b.g * (1 - alpha), b: a.b * alpha + b.b * (1 - alpha) });
}
const verdict = (r, min) => (r >= min ? "✅" : "❌");

const out = [];
const w = (s = "") => out.push(s);

// 1. Inventário
for (const [name, p] of Object.entries(PRESETS)) {
	w(`### ${name}`);
	w();
	w("| Token | Hex | L | C | H | Origem |");
	w("|---|---|---|---|---|---|");
	for (const t of TOKENS) {
		const v = get(p, t);
		if (!v) { w(`| \`${t}\` | *não definido* | | | | ausente |`); continue; }
		const { L, C, H } = lch(v);
		const own = name.startsWith("zinc") ? ".dark" : OWN[name][t === "cool (=primary)" ? "primary" : t] ? "preset" : "herdado de .dark";
		w(`| \`${t}\` | \`${v}\` | ${f(L)} | ${f(C)} | ${C < 0.002 ? "—" : f(H, 1)} | ${own} |`);
	}
	w();
}
w("<!-- METRICS -->");

// 2a. Croma médio das superfícies e escada ΔL
const SURF = ["background", "muted", "card", "popover", "surface-highest"];
w("| Preset | C médio superfícies | C máx | H médio | ΔL bg→muted | ΔL muted→card | ΔL card→popover | ΔL popover→highest | ΔL total |");
w("|---|---|---|---|---|---|---|---|---|");
for (const [name, p] of Object.entries(PRESETS)) {
	const s = SURF.map((t) => lch(p[t]));
	const cs = s.map((x) => x.C);
	const hs = s.filter((x) => x.C > 0.002).map((x) => x.H);
	const d = s.slice(1).map((x, i) => x.L - s[i].L);
	w(`| ${name} | ${f(cs.reduce((a, b) => a + b) / cs.length, 4)} | ${f(Math.max(...cs), 4)} | ${hs.length ? f(hs.reduce((a, b) => a + b) / hs.length, 1) : "— (neutro)"} | ${d.map((x) => f(x)).join(" | ")} | ${f(s[4].L - s[0].L)} |`);
}
w("<!-- CONTRAST -->");

// 2b. Contraste WCAG
w("| Par | " + Object.keys(PRESETS).join(" | ") + " |");
w("|---|" + Object.keys(PRESETS).map(() => "---").join("|") + "|");
const pairs = [];
for (const fg of ["foreground", "muted-foreground"]) for (const s of SURF) pairs.push([fg, s, 4.5]);
pairs.push(["primary-foreground", "primary", 4.5]);
pairs.push(["border", "card", 3]);
pairs.push(["border-subtle", "card", 3]);
pairs.push(["ring", "background", 3]);
pairs.push(["warm-foreground", "warm", 4.5]);
pairs.push(["alert-foreground", "alert", 4.5]);
pairs.push(["destructive", "card", 4.5]);
pairs.push(["primary", "muted", 3]);
pairs.push(["alert", "muted", 3]);
for (const [a, b, min] of pairs) {
	w(`| \`${a}\` vs \`${b}\` (mín ${min}) | ` + Object.values(PRESETS).map((p) => `${f(cr(p[a], p[b]), 2)} ${verdict(cr(p[a], p[b]), min)}`).join(" | ") + " |");
}
w("<!-- COMPOSITE -->");

// 2b'. Combinações reais da Início (tokens com opacidade sobre a superfície real)
const combos = [
	["`text-primary` sobre `bg-primary/15` sobre `surface-container` (botão modo ativo, SecurityTile)", (p) => cr(p.primary, over(p.primary, 0.15, p.card)), 4.5],
	["`text-primary` sobre `bg-primary/10` sobre `surface-container` (badge sensor, DeviceCard)", (p) => cr(p.primary, over(p.primary, 0.1, p.card)), 4.5],
	["`text-primary` sobre `surface-high` (rótulo LIGADO, DeviceCard)", (p) => cr(p.primary, p.popover), 4.5],
	["`text-primary` vs `text-foreground` (ΔE00 — estado ativo × texto normal)", (p) => dE(parse(p.primary), parse(p.foreground)), null],
	["`text-alert-foreground` sobre `bg-alert/10` sobre `background` (AlertBanner)", (p) => cr(p["alert-foreground"], over(p.alert, 0.1, p.background)), 4.5],
	["`text-alert-foreground` vs `text-foreground` (ΔE00 — ícone de alerta × texto)", (p) => dE(parse(p["alert-foreground"]), parse(p.foreground)), null],
	["`bg-primary` (switch ligado) vs `surface-low` (switch desligado) — contraste 1.4.11", (p) => cr(p.primary, p.muted), 3],
	["thumb `bg-background` vs trilho `bg-primary` (switch ligado)", (p) => cr(p.background, p.primary), 3],
	["`border-border-subtle` vs `surface-low` (borda dos tiles)", (p) => cr(p["border-subtle"], p.muted), 3],
	["`bg-surface-container` (card desligado) vs `bg-surface-low` (tile pai)", (p) => cr(p.card, p.muted), null],
	["`bg-surface-high` (card ligado) vs `bg-surface-container` (card desligado)", (p) => cr(p.popover, p.card), null],
	["`accent` (foco DropdownMenuItem) vs `surface-container` (conteúdo do dropdown no HomeHeader)", (p) => cr(p.accent, p.card), null],
];
w("| Combinação | " + Object.keys(PRESETS).join(" | ") + " |");
w("|---|" + Object.keys(PRESETS).map(() => "---").join("|") + "|");
for (const [label, fn, min] of combos) {
	w(`| ${label} | ` + Object.values(PRESETS).map((p) => { const v = fn(p); return min ? `${f(v, 2)} ${verdict(v, min)}` : f(v, 2); }).join(" | ") + " |");
}
w("<!-- COLLAPSE -->");

// 2c. Colapsos intra-preset (tokens com o mesmo valor)
const ROLE_TOKENS = TOKENS.filter((t) => !t.includes("foreground") && !t.startsWith("sidebar") && t !== "cool (=primary)");
for (const [name, p] of Object.entries(PRESETS)) {
	const groups = {};
	for (const t of ROLE_TOKENS) { const v = get(p, t)?.toLowerCase(); if (v) (groups[v] ??= []).push(t); }
	const dup = Object.entries(groups).filter(([, ts]) => ts.length > 1);
	w(`- **${name}**: ` + (dup.length ? dup.map(([v, ts]) => `\`${v}\` = ${ts.map((t) => `\`${t}\``).join(" = ")}`).join("; ") : "nenhum"));
}
w("<!-- CROSS -->");
for (const t of ["warm", "alert", "brand-accent", "brand-muted", "destructive", "primary"]) {
	const vals = Object.entries(PRESETS).map(([n, p]) => [n, p[t]]);
	const uniq = new Set(vals.map(([, v]) => v?.toLowerCase()));
	const chroma = vals.map(([n, v]) => `${n.split(" ")[0]} C=${f(lch(v).C)}`).join(", ");
	w(`- \`${t}\`: ${uniq.size} valor(es) distinto(s) em 5 presets — ${chroma}`);
}
w("<!-- CHART -->");

// 2d. chart-1..5 sob CVD
w("| Preset | C médio chart | ΔE00 mín (normal) | par | ΔE00 mín (deuteranopia) | par | ΔE00 mín (protanopia) | par | chart vs card (WCAG mín) |");
w("|---|---|---|---|---|---|---|---|---|");
for (const [name, p] of Object.entries(PRESETS)) {
	const ch = [1, 2, 3, 4, 5].map((i) => [`chart-${i}`, parse(p[`chart-${i}`])]);
	const minPair = (fn) => {
		let best = [Infinity, ""];
		for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
			const d = dE(fn(ch[i][1]), fn(ch[j][1]));
			if (d < best[0]) best = [d, `${i + 1}×${j + 1}`];
		}
		return best;
	};
	const n = minPair((c) => c), d = minPair(deuter), pr = minPair(prot);
	const cMean = ch.reduce((a, [, c]) => a + toOklch(c).c, 0) / 5;
	const minBg = Math.min(...ch.map(([, c]) => wcagContrast(c, parse(p.card))));
	w(`| ${name} | ${f(cMean)} | ${f(n[0], 1)} | ${n[1]} | ${f(d[0], 1)} | ${d[1]} | ${f(pr[0], 1)} | ${pr[1]} | ${f(minBg, 2)} |`);
}
w();
// pares de chart abaixo de ΔE 10 sob CVD
for (const [name, p] of Object.entries(PRESETS)) {
	const bad = [];
	for (let i = 1; i <= 5; i++) for (let j = i + 1; j <= 5; j++) {
		for (const [lab, fn] of [["deut", deuter], ["prot", prot]]) {
			const v = dE(fn(parse(p[`chart-${i}`])), fn(parse(p[`chart-${j}`])));
			if (v < 10) bad.push(`${i}×${j} ${lab} ${f(v, 1)}`);
		}
	}
	w(`- ${name}: ${bad.length ? bad.join(", ") : "nenhum par < 10"}`);
}

// Cores hardcoded da Início (paleta Tailwind v4 default) vs superfície de cada preset
w("<!-- HARDCODED -->");
const TW = { "emerald-400": "oklch(76.5% 0.177 163.223)", "emerald-500": "oklch(69.6% 0.17 162.48)", "amber-300": "oklch(87.9% 0.169 91.605)", "amber-400": "oklch(82.8% 0.189 84.429)", "sky-400": "oklch(74.6% 0.16 232.661)", "purple-400": "oklch(71.4% 0.203 305.504)", "rose-400": "oklch(71.2% 0.194 13.428)" };
w("| Cor Tailwind | Hex | L | C | H | contraste vs `surface-low` (zinc / indigo / slate / github / graphite) |");
w("|---|---|---|---|---|---|");
for (const [k, v] of Object.entries(TW)) {
	const c = toOklch(parse(v));
	w(`| \`${k}\` | \`${formatHex(parse(v))}\` | ${f(c.l)} | ${f(c.c)} | ${f(c.h, 1)} | ${Object.values(PRESETS).map((p) => f(wcagContrast(parse(v), parse(p.muted)), 2)).join(" / ")} |`);
}

console.log(out.join("\n"));
```
