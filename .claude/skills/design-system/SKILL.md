---
name: design-system
description: Escada de superfícies, espaçamento, raio, tipografia e temas alternativos do design system do Smart Home Hub. Use sempre que criar, editar ou revisar um componente visual React/Tailwind (cards, modais, pills, KPIs, listas).
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/app/styles/**"
---

# Design System — Smart Home Hub

> Padrão universal — não é recomendação por feature. Nunca criar token novo de cor/espaçamento/raio: usar exclusivamente os já definidos em `frontend/src/app/styles/index.css`.

## Escada de superfícies
Não são cores novas — são aliases sobre tokens do shadcn:
```css
--color-surface-low: var(--muted);
--color-surface-container: var(--card);
--color-surface-high: var(--popover);
--color-surface-highest: var(--surface-highest);
```
Elevação sempre crescente do pai pro filho: `bg-background`/`bg-muted` → `bg-popover` → `bg-card` → `bg-surface-highest`, nunca o inverso. Um Dialog nasce em `bg-popover` — cards internos sobem pra `bg-surface-high`, nunca repetem `bg-surface-container`.

## Temas alternativos (`data-theme`)
`.dark` é só o preset padrão (zinc). Existem 4 presets via `data-theme`: `indigo`, `slate-cyan`, `github-dimmed`, `contrast-safe-graphite`. Cada preset redefine o conjunto COMPLETO de variáveis — nunca redefina uma variável isolada. `contrast-safe-graphite` tem razões de contraste WCAG calculadas matematicamente; não adicione tingimento de cor a um preset novo sem recalcular esses pares.

## Espaçamento (grid de 4px)
Só 5 paradas: `p-1`/`gap-1` (4px, ícone⇄texto), `p-2`/`gap-2` (8px, pills/lista compacta), `p-4`/`gap-4` (16px, padrão de cards/inputs), `p-6`/`gap-6` (24px, containers principais), `p-8`/`gap-8` (32px, margem externa da tela). Eliminar valores quebrados (`p-3`, `p-5`, `gap-1.5`, `mb-5`) sem justificativa. Exceções sancionadas: Label⇄Input `gap-1.5`, campos da mesma seção `space-y-3/4`, Input⇄erro `mt-1`.

## Raio aninhado
Pai sempre com raio maior que o filho. Escada: `--radius-sm` (0.6×) → `md` (0.8×) → `lg` (1×, base 0.75rem) → `xl` (1.4×) → `2xl` (1.8×) → `3xl` (2.2×) → `4xl` (2.6×). Nunca `rounded` bare nem arbitrário.

## Tipografia
Título de tela: `text-2xl`–`text-3xl font-semibold`. Título de card: `text-lg`–`text-xl font-medium`. Corpo: `text-sm text-muted-foreground`. Labels/micro (uppercase): `text-xs font-medium uppercase tracking-wider`. Piso da escala é `text-xs` — nunca `text-[10px]`. KPIs em destaque: `text-2xl font-semibold`, nunca `font-bold`.

## Componentização
- Pills de filtro: `h-8` fixo, `px-3`/`px-4`, `text-sm` — nunca altura variável via `py-*`.
- Lista (modo linha): `divide-y` no container pai — nunca `border-b` por item.
- KPI: label `text-xs uppercase text-muted-foreground` (com `truncate`/`min-w-0` se longo) + valor `text-2xl font-semibold` em `text-primary`/`text-warm`/`text-cool`/`text-alert-foreground` — nunca cor nova. **KPI agregado sempre de query dedicada no backend, nunca derivado só da página atual.**

## Scroll
`.scrollbar-thin` (de `animations.css`) em vez da scrollbar nativa. Fade-out no fim de área rolável: `bg-linear-to-t from-<superfície-ambiente> to-transparent`, com o `from-*` igual ao `bg-*` real do container (`from-surface-low` num painel, `from-popover` num Dialog).

## Referência completa
Exemplos reais de antes/depois de auditorias já aplicadas: `frontend/docs/ui-and-design-system.md`.