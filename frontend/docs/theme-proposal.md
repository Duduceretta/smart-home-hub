# Proposta de paleta — presets dark

> **Status:** proposta **não aplicada**. `index.css`, componentes e docs continuam intactos.
> **Base:** [`theme-audit.md`](./theme-audit.md) (achados R1–R9, Y1–Y14, B1–B7).
> **Revisão v2 (2026-09-23) — daltonismo:** primaries diferenciadas por L e C, e não só por matiz; charts com escada de luminosidade + matiz (padrão IBM Carbon / Okabe-Ito); status separados por L. Critério "bom para todos": visão normal, deuteranopia, protanopia e tritanopia.
> **Verificação:** `npm run check:theme -- docs/theme-proposal.md` → **0 falhas** (365 checagens, 73 por preset, + 4 entre presets). Os mesmos blocos CSS deste documento são a entrada do checker.
> **Preview visual:** [`theme-preview.html`](./theme-preview.html), que abre direto no navegador. Tem um toggle **Proposta / Atual** e outro **Simular: normal / deuteranopia / protanopia / tritanopia**, aplicado à página inteira.

## 0. Exceção aprovada — 6 tokens novos

**Aprovada em 2026-09-23.** É a exceção à regra "Proibido criar token novo de cor/espaçamento/raio" do `frontend/CLAUDE.md`. O texto da regra ganha a ressalva correspondente na §10.2.

| Token | Por quê (achado do audit) |
|---|---|
| `--success`, `--success-foreground` | R4, Y13: sucesso hoje é `emerald-*` cru em 6 lugares, somado a `primary` no MediaTile |
| `--warning`, `--warning-foreground` | R4, Y4: aviso é `amber-*` cru; `warm` muda de papel conforme o preset (cinza → âmbar) |
| `--info`, `--info-foreground` | R4: info é `sky-*` cru |

Também entram no `@theme inline`: `--color-destructive-foreground` (Y11, sem valor novo; o token já existia no graphite), os 6 tokens acima e os aliases deprecated `--warm` / `--cool`.

---

## 1. Resumo por preset

| Preset | Neutros (H / C) | Escada L (bg → highest) | ΔL tile×página | card vs bg | primary (L / C / H) | L status (S / W / I / A) | Charts L (1 → 5) | Charts H (1 → 5) | ΔE00 mín charts (normal / deut / prot / trit) |
|---|---|---|---|---|---|---|---|---|---|
| zinc-minimalist | 200° / 0.005 | 0.16 → 0.205 → 0.25 → 0.295 → 0.34 | 0.088 | 1.21:1 | 0.74 / 0.14 / 165° | 0.84 / 0.83 / 0.77 / 0.76 | 0.56 → 0.64 → 0.72 → 0.79 → 0.87 | 149, 340, 110, 268, 55 | 27.3 / 18.0 / 19.3 / 18.2 |
| indigo | 277° / 0.02 | 0.155 → 0.2 → 0.245 → 0.29 → 0.335 | 0.092 | 1.21:1 | 0.76 / 0.13 / 288° | 0.84 / 0.83 / 0.75 / 0.75 | 0.55 → 0.64 → 0.73 → 0.79 → 0.88 | 280, 50, 168, 313, 120 | 26.3 / 19.9 / 20.9 / 25.0 |
| slate-cyan | 255° / 0.026 | 0.165 → 0.21 → 0.255 → 0.3 → 0.345 | 0.087 | 1.21:1 | 0.74 / 0.11 / 205° | 0.86 / 0.84 / 0.77 / 0.76 | 0.57 → 0.64 → 0.72 → 0.80 → 0.88 | 201, 50, 280, 110, 170 | 30.8 / 18.1 / 20.7 / 19.7 |
| github-dimmed | 256° / 0.016 | 0.246 → 0.286 → 0.326 → 0.366 → 0.406 | 0.081 | 1.31:1 | 0.83 / 0.09 / 249° | 0.81 / 0.84 / 0.82 / 0.84 | 0.62 → 0.69 → 0.75 → 0.81 → 0.88 | 250, 50, 169, 280, 91 | 22.7 / 18.0 / 16.9 / 16.9 |
| contrast-safe-graphite | — / 0 (neutro) | 0.15 → 0.2 → 0.25 → 0.3 → 0.35 | 0.102 | 1.24:1 | 0.84 / 0.11 / 330° | 0.92 / 0.88 / 0.84 / 0.83 | 0.59 → 0.67 → 0.74 → 0.80 → 0.88 | 320, 50, 160, 280, 100 | 27.9 / 20.2 / 17.9 / 20.2 |

Colunas: "ΔL tile×página" e "card vs bg" são medidos no hex final. "ΔE00 mín charts" é o menor par de séries sob cada tipo de visão (Machado 2009, severidade 1).

### Identidade

- **zinc-minimalist:** neutros quase acromáticos (C 0.005) em H 200°, um frio sutil. O `primary` deixa de ser branco e vira **teal** (H 165°) da família do `#12967a` (`brand-accent`, intacto como cor de marca), em tom claro de dark (L 0.74, C 0.14). Resolve R1.
- **indigo:** neutros tingidos de índigo (H 277°, C 0.02). O acento é a família do `#5e6ad2` puxada para o violeta (H 288°) e levada a tom claro (L 0.76). Com isso ele se afasta do azul Primer (§1.1). O `#5e6ad2` original vira `brand-accent`.
- **slate-cyan:** neutros slate azulado (H 255°, C 0.026, o mais tingido). O acento é ciano (H 205°, L 0.74, C 0.11). O `#06b6d4` original vira `brand-accent`.
- **github-dimmed:** baseado no Primer *dark dimmed* real (o preset atual usa o Primer *dark default*, com `#0d1117`, e não o dimmed):
  - `background` ≈ `canvas.inset` `#1c2128`; `card` ≈ `canvas.overlay` `#2d333b`; `surface-highest` ≈ `border.default` `#444c56`.
  - Status com as matizes do Primer: success 144° (`success.fg`), warning 79° (`attention.fg`), alert 27° (`danger.fg`).
  - O `primary` é o **azul Primer mais próximo de `accent.fg` `#539bf5` que o 4.5:1 permite**: H 249°, L 0.835. O `#539bf5` (L 0.684) falha como texto sobre `primary/15` em `popover`, e em L 0.835 o gamut sRGB limita o croma a 0.086.
  - Correções em relação ao Primer, que falha no nosso mínimo: `fg.muted` `#768390` tem 3.29:1 sobre overlay, então o `muted-foreground` sobe e passa a ocupar o lugar do `fg.default`; e o `foreground` sobe também.
  - Resolve `primary-foreground` 3.75 → ≥ 4.5 (R7) e `chart-1 × chart-5` sob protanopia 0.2 → ≥ 12.
- **contrast-safe-graphite:** a identidade é a acessibilidade.
  - Superfícies com **C = 0**. É a única exceção a "neutros tingidos", justificada porque qualquer tingimento reduz a margem que define o preset.
  - Cor só em acento e status. O acento é orquídea (H 330°, L 0.84), a família livre longe dos outros 4 acentos e dos status.
  - Alvos maiores: texto ≥ 5.5:1 e UI ≥ 3.6:1. Menor texto medido 5.53:1 e menor UI 3.64:1, contra 4.60–4.62 e 3.11–3.15 nos demais. ΔL tile 0.102. Zera R6.

### 1.1 Daltonismo — antes (v1) × depois

A v1 separava primaries e charts **só por matiz**, com L quase igual (primaries 0.73–0.84; charts todos em L 0.74 / C 0.15). Sob deuteranopia e protanopia, o eixo vermelho–verde some e sobra essencialmente o eixo azul–amarelo, então matizes diferentes colapsam. A v2 usa **L como canal principal** onde o contraste deixa espaço.

#### Primaries

| Preset | Antes (v1) | L / C / H | Depois | L / C / H |
|---|---|---|---|---|
| zinc-minimalist | `#3ec0a3` | 0.73 / 0.12 / 175° | `#37c695` | 0.74 / 0.14 / 165° |
| indigo | `#98a4fe` | 0.75 / 0.13 / 277° | `#aca2ff` | 0.76 / 0.13 / 288° |
| slate-cyan | `#00bddc` | 0.73 / 0.13 / 215° | `#3fbfcc` | 0.74 / 0.11 / 205° |
| github-dimmed | `#9dceff` | 0.83 / 0.09 / 249° | `#9dceff` | 0.83 / 0.09 / 249° |
| contrast-safe-graphite | `#efa9ff` | 0.83 / 0.14 / 320° | `#f4b0ed` | 0.84 / 0.11 / 330° |

ΔE00 entre primaries de presets diferentes (normal / deut / prot / trit):

| Par | Antes | Depois |
|---|---|---|
| zinc-minimalist × indigo | 37.4 / 18.1 / 31.0 / 16.9 | 42.8 / 25.7 / 38.5 / 23.4 |
| zinc-minimalist × slate-cyan | 20.9 / 18.0 / 25.1 / 3.4 | 20.7 / 19.8 / 25.2 / 3.7 |
| zinc-minimalist × github-dimmed | 29.7 / 18.1 / 26.2 / 11.7 | 34.5 / 24.2 / 32.7 / 12.3 |
| zinc-minimalist × contrast-safe-graphite | 44.3 / 17.7 / 29.1 / 56.6 | 46.7 / 20.1 / 31.7 / 53.6 |
| indigo × slate-cyan | 26.0 / 8.6 / 6.0 / 17.7 | 30.4 / 7.4 / 12.1 / 21.9 |
| indigo × github-dimmed | 12.4 / 8.8 / 10.1 / 12.0 | 15.3 / 7.5 / 10.0 / 18.2 |
| indigo × contrast-safe-graphite | 19.0 / 8.4 / 4.1 / 38.7 | 17.5 / 11.6 / 7.6 / 29.1 |
| slate-cyan × github-dimmed | 16.1 / 16.6 / 9.1 / 11.1 | 18.3 / 11.1 / 9.7 / 9.8 |
| slate-cyan × contrast-safe-graphite | 43.7 / 16.1 / 5.9 / 61.1 | 44.6 / 12.1 / 6.9 / 60.1 |
| github-dimmed × contrast-safe-graphite | 27.3 / 0.5 / 6.1 / 47.1 | 30.1 / 5.4 / 3.9 / 48.4 |
| **pior par** | **12.4 / 0.5 / 4.1 / 3.4** | **15.3 / 5.4 / 3.9 / 3.7** |

- **Pior par caiu de 0.5 para 3.9** (sob deut/prot). O teto é estrutural:
  - As 5 famílias pedidas (teal, índigo, ciano, azul, orquídea) caem todas no lado "azul" do eixo que sobra sob deuteranopia e protanopia.
  - A faixa de L permitida é estreita: o mínimo vem do 4.5:1 sobre `primary/15` em `popover`, e o teto de 0.86 existe porque acima disso o primary vira pastel/branco e regride R1.
  - O github-dimmed é fixo, porque precisa ser o mais próximo do `#539bf5`.
  - Gargalos: **github × graphite sob protanopia (3.9)** e **zinc × slate sob tritanopia (3.7, teal × ciano)**. A tritanopia é medida e reportada, mas não entrou no objetivo, porque a meta pedida é deuteranopia/protanopia e ela é rara (< 0,01% da população).
- **O que foi otimizado:** busca exata *maximin* sobre L (passo 0.02), C (0.11 / 0.14 / 0.17) e H (família ±10°) nos 4 presets livres, sob normal + deuteranopia + protanopia. Depois, refinamento *leximin* (melhora o 2º pior par sem piorar o 1º). O resultado é o `indigo` puxado para o violeta e o `graphite` e o `zinc` separados por L e C.
- **Família não foi trocada.** Chegar a ΔE ≥ 10 entre todos os presets exigiria tirar um preset do lado azul (ex.: graphite em âmbar). Isso colidiria com `warning` e mudaria a identidade pedida. Fica registrado como opção e não foi aplicado.
- **Mitigação que não depende de cor:** o seletor de tema (`ThemePresetSelector`) mostra o **nome** do preset nas duas variantes (grade: rótulo + ✓ + anel; dropdown: rótulo + radio). Detalhes do gatilho compacto na §9.

#### Charts (escada de L: **chart-1 mais escuro → chart-5 mais claro**, em todos os presets)

#### zinc-minimalist

| Série | Antes | L / C / H | Depois | L / C / H |
|---|---|---|---|---|
| chart-1 | `#00c9ae` | 0.75 / 0.14 / 178° | `#008d3c` | 0.56 / 0.16 / 149° |
| chart-2 | `#39b5ff` | 0.74 / 0.15 / 240° | `#c960aa` | 0.64 / 0.16 / 340° |
| chart-3 | `#f57fa7` | 0.74 / 0.15 / 360° | `#acac00` | 0.72 / 0.16 / 110° |
| chart-4 | `#dc9e12` | 0.74 / 0.15 / 80° | `#9fbaff` | 0.79 / 0.10 / 268° |
| chart-5 | `#5ac576` | 0.74 / 0.15 / 150° | `#ffc59e` | 0.87 / 0.08 / 55° |
| **ΔE00 mín** normal / deut / prot / trit | | **14.2 / 12.6 / 12.5 / 5.9** | | **27.3 / 18.0 / 19.3 / 18.2** |

#### indigo

| Série | Antes | L / C / H | Depois | L / C / H |
|---|---|---|---|---|
| chart-1 | `#90a1ff` | 0.73 / 0.14 / 275° | `#6463cd` | 0.55 / 0.16 / 280° |
| chart-2 | `#f57fa7` | 0.74 / 0.15 / 360° | `#d56817` | 0.64 / 0.16 / 50° |
| chart-3 | `#dc9e12` | 0.74 / 0.15 / 80° | `#00c394` | 0.73 / 0.15 / 168° |
| chart-4 | `#5ac576` | 0.74 / 0.15 / 150° | `#dd9eff` | 0.79 / 0.15 / 313° |
| chart-5 | `#00c9ae` | 0.75 / 0.14 / 178° | `#cae763` | 0.88 / 0.16 / 120° |
| **ΔE00 mín** normal / deut / prot / trit | | **14.2 / 12.5 / 12.5 / 5.9** | | **26.3 / 19.9 / 20.9 / 25.0** |

#### slate-cyan

| Série | Antes | L / C / H | Depois | L / C / H |
|---|---|---|---|---|
| chart-1 | `#00c1e5` | 0.75 / 0.13 / 218° | `#00888f` | 0.57 / 0.10 / 201° |
| chart-2 | `#f77f9e` | 0.74 / 0.15 / 5° | `#d66919` | 0.64 / 0.16 / 50° |
| chart-3 | `#e19b1b` | 0.74 / 0.15 / 75° | `#9296ff` | 0.72 / 0.15 / 280° |
| chart-4 | `#5ac576` | 0.74 / 0.15 / 150° | `#c5c632` | 0.80 / 0.16 / 110° |
| chart-5 | `#00c9a5` | 0.75 / 0.14 / 174° | `#41f9c7` | 0.88 / 0.16 / 170° |
| **ΔE00 mín** normal / deut / prot / trit | | **11.8 / 12.3 / 12.1 / 3.8** | | **30.8 / 18.1 / 20.7 / 19.7** |

#### github-dimmed

| Série | Antes | L / C / H | Depois | L / C / H |
|---|---|---|---|---|
| chart-1 | `#4ab3ff` | 0.74 / 0.15 / 244° | `#2389e2` | 0.62 / 0.16 / 250° |
| chart-2 | `#f57fa7` | 0.74 / 0.15 / 360° | `#e6772e` | 0.69 / 0.16 / 50° |
| chart-3 | `#dc9e12` | 0.74 / 0.15 / 80° | `#00cd9e` | 0.75 / 0.15 / 169° |
| chart-4 | `#5ac576` | 0.74 / 0.15 / 150° | `#b4baff` | 0.81 / 0.10 / 280° |
| chart-5 | `#00c9ae` | 0.75 / 0.14 / 178° | `#ffd243` | 0.88 / 0.16 / 91° |
| **ΔE00 mín** normal / deut / prot / trit | | **14.2 / 12.5 / 12.5 / 5.9** | | **22.7 / 18.0 / 16.9 / 16.9** |

#### contrast-safe-graphite

| Série | Antes | L / C / H | Depois | L / C / H |
|---|---|---|---|---|
| chart-1 | `#c88ef1` | 0.74 / 0.15 / 310° | `#a75ab9` | 0.59 / 0.16 / 320° |
| chart-2 | `#f77f9e` | 0.74 / 0.15 / 5° | `#df7126` | 0.67 / 0.16 / 50° |
| chart-3 | `#e19b1b` | 0.74 / 0.15 / 75° | `#22c886` | 0.74 / 0.16 / 160° |
| chart-4 | `#5ac576` | 0.74 / 0.15 / 150° | `#b1b8ff` | 0.80 / 0.10 / 280° |
| chart-5 | `#00c9a5` | 0.75 / 0.14 / 174° | `#f0d947` | 0.88 / 0.16 / 100° |
| **ΔE00 mín** normal / deut / prot / trit | | **11.8 / 12.3 / 12.1 / 5.6** | | **27.9 / 20.2 / 17.9 / 20.2** |


- **Mínimo ≥ 16.9 em todos os presets nas 4 visões** (piso 12, alvo 15: atingido em todos). Na v1, a tritanopia ficava em 5.9.
- A escada tem passos iguais de L, entre L1 (menor L em que qualquer matiz passa 3.1:1 contra `card`) e L5 = 0.88. Acima de 0.88, quase toda matiz perde croma no gamut sRGB e a série vira "quase branca".
- As matizes ficam ≥ 30° entre si, e a faixa 0–40° (vermelho de alerta, H 25–27) fica excluída.

#### Status

| Preset | Antes: L S / W / I / A | ΔE00 mín antes (normal / deut / prot / trit) | Depois: L S / W / I / A | ΔE00 mín depois |
|---|---|---|---|---|
| zinc-minimalist | 0.77 / 0.77 / 0.76 / 0.76 | 30.3 / 0.5 / 11.6 / 5.7 | 0.84 / 0.83 / 0.77 / 0.76 | 31.0 / 7.5 / 11.4 / 7.7 |
| indigo | 0.75 / 0.75 / 0.75 / 0.75 | 31.1 / 0.2 / 11.8 / 6.0 | 0.84 / 0.83 / 0.75 / 0.75 | 31.8 / 8.2 / 10.8 / 8.5 |
| slate-cyan | 0.77 / 0.78 / 0.77 / 0.76 | 30.2 / 0.8 / 11.5 / 5.6 | 0.86 / 0.84 / 0.77 / 0.76 | 31.7 / 7.9 / 11.0 / 8.2 |
| github-dimmed | 0.86 / 0.85 / 0.85 / 0.84 | 27.7 / 6.6 / 8.9 / 6.7 | 0.81 / 0.84 / 0.82 / 0.84 | 27.1 / 7.2 / 8.3 / 7.2 |
| contrast-safe-graphite | 0.84 / 0.84 / 0.83 / 0.83 | 27.8 / 3.6 / 10.5 / 6.4 | 0.92 / 0.88 / 0.84 / 0.83 | 27.2 / 7.0 / 7.7 / 7.0 |

- **success × alert sob deuteranopia: de 0.2–0.8 para 7.0–8.2** (github e graphite: 6.6 e 3.6 → 7.2 e 7.0). A separação é por L: `alert` fica no menor L que passa o contraste (vermelho saturado; subir o L deixava o alerta rosa-pastel), e `success` / `warning` sobem.
- Os status continuam abaixo de 10 sob CVD. Por isso **a regra §10.3 (status sempre com ícone ou texto) é obrigatória**, e não opcional. O `HomeSecurityTile` já troca o ícone (ShieldCheck × ShieldAlert), e os badges levam rótulo.

---

## 2. Método

1. **Tudo em OKLCH.** Cada token é `(L, C, H)`, convertido para hex no fim com `toGamut("rgb", "oklch")` do culori, que reduz C até caber em sRGB mantendo L e H.
2. **Escada de superfícies uniforme:** `L = L0 + i·s` (i = 0…4) para `background → muted → card → popover → surface-highest`, com C e H constantes por preset. Isso resolve o salto desbalanceado do graphite (0.148 / 0.086 / 0.081 / 0.078 no audit). A razão maior/menor degrau, medida no hex final, fica ≤ 1.5 (checagem `escada`).
3. **"Mínimo necessário", não máximo.** Cada cor dependente parte do **menor L** (passo de 0.005) que atinge o alvo contra todas as superfícies relevantes. Os alvos são 4.6 (texto) e 3.1 (UI) nos presets comuns, uma folga de 0.1 sobre o WCAG para absorver o arredondamento do hex, e 5.5 / 3.6 no graphite.
   - `muted-foreground`: ≥ alvo sobre as 5 superfícies, incluindo `surface-highest` (Y8).
   - `primary`: candidatos válidos = texto ≥ alvo sobre `card`, `popover` e `primary/15` composto sobre ambos, e `primary-foreground` ≥ alvo sobre ele (M3: primary em tom claro, on-primary escuro); além disso, croma efetivo ≥ 0.10 (a família continua reconhecível) e L ≤ 0.86. Entre os válidos, a escolha maximiza a distância entre presets sob CVD (§1.1).
   - Status: matizes fixas entre presets (150 / 75 / 235 / 25; no github, as do Primer), C 0.15, e **L individual**. `alert` fica no L mínimo (±0.02); os demais variam até +0.12 (warning até 0.92), escolhidos para maximizar o menor ΔE00 entre status nas 4 visões. O desempate vai para a menor faixa de L. `-foreground` = L 0.20 da mesma matiz.
   - `border`: ≥ 3:1 vs `card`. `border-subtle` = L(`surface-highest`) + 0.03, sempre < L(`border`) (Y10), e **não** sobe para 3:1.
4. **`chart-1..5`:** escada de L com passos iguais (chart-1 escuro → chart-5 claro, L5 = 0.88), C 0.16 (limitado pelo gamut), e matizes em grade de 10° com ≥ 30° entre si. `chart-1` fica ancorada a ±15° da matiz do `primary`, e a faixa 0–40° é excluída. A busca é exaustiva (DFS com poda) e maximiza o menor ΔE00 entre pares sob normal, deuteranopia, protanopia e tritanopia.
5. **Composição de opacidade:** `bg-x/NN` do Tailwind v4 composto em sRGB sobre a superfície opaca real (mesmo método do audit).
6. **Aliases deprecated:** `--warm: var(--warning)` e `--cool: var(--primary)` ficam no `.dark`. Como `var()` em custom property resolve no elemento que declara (`<html>`, onde também estão `.dark` e `data-theme`), o alias acompanha o preset ativo sem ser repetido em cada bloco.
7. **Simulação de daltonismo:** Machado, Oliveira & Fernandes (2009), severidade 1, com as matrizes do culori. O `theme-preview.html` usa as mesmas matrizes em `feColorMatrix`.

---

## 3. Tabelas por preset

"Hex antigo" = valor efetivo hoje (preset + herança do `.dark`). `—` = token inexistente hoje.

### 3.1 zinc-minimalist (`.dark`)

| Token | Hex antigo | Hex novo | OKLCH (L C H) | Papel |
|---|---|---|---|---|
| `background` | `#09090b` | `#0b0e0e` | 0.160 0.005 196.7 | Página (fundo do `<main>` e do shell) |
| `foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto principal |
| `muted` | `#121215` | `#151818` | 0.206 0.005 196.8 | surface-low: poço/recuo (trilho de switch/progresso, skeleton, input) |
| `card` | `#18181b` | `#1f2222` | 0.249 0.004 196.9 | surface-container: **tile** da página |
| `card-foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto sobre card |
| `popover` | `#27272a` | `#2a2d2d` | 0.294 0.004 196.9 | surface-high: elemento interno do tile, menu, dialog |
| `popover-foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto sobre popover |
| `surface-highest` | `#3f3f46` | `#353939` | 0.341 0.005 196.9 | Hover/selecionado dentro de popover |
| `primary` | `#fafafa` | `#37c695` | 0.740 0.140 165.3 | Ação primária, item ativo, foco; legível como texto |
| `primary-foreground` | `#18181b` | `#001d10` | 0.204 0.045 161.2 | Texto sobre `bg-primary` sólido |
| `secondary` | `#27272a` | `#353939` | 0.341 0.005 196.9 | Botão secundário (= surface-highest, visível sobre card e popover) |
| `secondary-foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto sobre secondary |
| `muted-foreground` | `#a1a1aa` | `#a0a4a4` | 0.715 0.005 197.1 | Texto secundário (≥ 4.5 em todas as superfícies) |
| `accent` | `#18181b` | `#353939` | 0.341 0.005 196.9 | shadcn: fundo de hover/foco ghost/menu (= surface-highest). **Nunca marca.** |
| `accent-foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto sobre accent |
| `destructive` | `#ef4444` | `#ff8981` | 0.758 0.144 25.1 | Ação destrutiva (= alert) |
| `destructive-foreground` | — | `#290b0a` | 0.200 0.051 24.6 | Texto sobre destructive sólido |
| `border-subtle` | `#27272a` | `#3d4141` | 0.372 0.005 196.9 | Divisor/reforço de tile (L < border) |
| `border` | `#3f3f46` | `#6a6e6e` | 0.535 0.005 197.0 | Borda de componente interativo (≥ 3:1 vs card) |
| `input` | `#52525b` | `#6a6e6e` | 0.535 0.005 197.0 | Borda de input (= border) |
| `ring` | `#d4d4d8` | `#37c695` | 0.740 0.140 165.3 | Anel de foco (= primary) |
| `chart-1` | `#fafafa` | `#008d3c` | 0.562 0.158 149.2 | Série 1 — a mais escura (matiz do primary) |
| `chart-2` | `#a1a1aa` | `#c960aa` | 0.639 0.159 340.0 | Série 2 |
| `chart-3` | `#71717a` | `#acac00` | 0.721 0.157 109.8 | Série 3 |
| `chart-4` | `#52525b` | `#9fbaff` | 0.795 0.103 267.6 | Série 4 |
| `chart-5` | `#3f3f46` | `#ffc59e` | 0.866 0.084 55.2 | Série 5 — a mais clara |
| `sidebar` | `#09090b` | `#0b0e0e` | 0.160 0.005 196.7 | Sidebar (= background) |
| `sidebar-foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto da sidebar |
| `sidebar-primary` | `#fafafa` | `#37c695` | 0.740 0.140 165.3 | Item ativo da sidebar |
| `sidebar-primary-foreground` | `#18181b` | `#001d10` | 0.204 0.045 161.2 | Texto sobre item ativo |
| `sidebar-accent` | `#18181b` | `#1f2222` | 0.249 0.004 196.9 | Hover na sidebar (= card) |
| `sidebar-accent-foreground` | `#fafafa` | `#f4f5f5` | 0.969 0.001 — | Texto no hover |
| `sidebar-border` | `#27272a` | `#3d4141` | 0.372 0.005 196.9 | Divisor da sidebar |
| `sidebar-ring` | `#fafafa` | `#37c695` | 0.740 0.140 165.3 | Foco na sidebar |
| `success` | — | `#7de797` | 0.844 0.149 150.1 | **Novo** · status sucesso (texto/ícone/tint) |
| `success-foreground` | — | `#021c09` | 0.200 0.050 150.3 | **Novo** · texto sobre success sólido |
| `warning` | — | `#ffb846` | 0.830 0.149 75.4 | **Novo** · status aviso (substitui `warm`) |
| `warning-foreground` | — | `#231200` | 0.202 0.044 69.0 | **Novo** · texto sobre warning sólido |
| `info` | — | `#33c2ff` | 0.767 0.144 232.3 | **Novo** · status informativo |
| `info-foreground` | — | `#001929` | 0.203 0.046 238.9 | **Novo** · texto sobre info sólido |
| `alert` | `#ef4444` | `#ff8981` | 0.758 0.144 25.1 | Status alerta (texto/ícone usa `alert`) |
| `alert-foreground` | `#ffffff` | `#290b0a` | 0.200 0.051 24.6 | Texto sobre alert sólido (escuro) |
| `brand-accent` | `#12967a` | `#12967a` | 0.602 0.112 172.8 | Marca (monograma, AuthLayout) |
| `brand-muted` | `#d6d3ce` | `#cdd7d2` | 0.870 0.013 164.8 | Marca, forma secundária do monograma |

### 3.2 indigo

| Token | Hex antigo | Hex novo | OKLCH (L C H) | Papel |
|---|---|---|---|---|
| `background` | `#08090d` | `#0a0b15` | 0.154 0.021 279.2 | Página (fundo do `<main>` e do shell) |
| `foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto principal |
| `muted` | `#0f1118` | `#14151f` | 0.200 0.020 280.0 | surface-low: poço/recuo (trilho de switch/progresso, skeleton, input) |
| `card` | `#151824` | `#1e202a` | 0.246 0.019 276.0 | surface-container: **tile** da página |
| `card-foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto sobre card |
| `popover` | `#1f2334` | `#292b35` | 0.291 0.018 276.3 | surface-high: elemento interno do tile, menu, dialog |
| `popover-foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto sobre popover |
| `surface-highest` | `#2c324b` | `#343641` | 0.335 0.020 277.2 | Hover/selecionado dentro de popover |
| `primary` | `#5e6ad2` | `#aca2ff` | 0.757 0.132 287.7 | Ação primária, item ativo, foco; legível como texto |
| `primary-foreground` | `#ffffff` | `#15122b` | 0.201 0.049 286.6 | Texto sobre `bg-primary` sólido |
| `secondary` | `#1f2334` | `#343641` | 0.335 0.020 277.2 | Botão secundário (= surface-highest, visível sobre card e popover) |
| `secondary-foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto sobre secondary |
| `muted-foreground` | `#8a92a6` | `#9fa1ac` | 0.711 0.016 277.7 | Texto secundário (≥ 4.5 em todas as superfícies) |
| `accent` | `#151824` | `#343641` | 0.335 0.020 277.2 | shadcn: fundo de hover/foco ghost/menu (= surface-highest). **Nunca marca.** |
| `accent-foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto sobre accent |
| `destructive` | `#f43f5e` | `#ff847d` | 0.750 0.151 24.7 | Ação destrutiva (= alert) |
| `destructive-foreground` | — | `#290b0a` | 0.200 0.051 24.6 | Texto sobre destructive sólido |
| `border-subtle` | `#1e2233` | `#3b3e49` | 0.365 0.019 273.4 | Divisor/reforço de tile (L < border) |
| `border` | `#2e344e` | `#6a6c79` | 0.534 0.020 278.7 | Borda de componente interativo (≥ 3:1 vs card) |
| `input` | `#3d4566` | `#6a6c79` | 0.534 0.020 278.7 | Borda de input (= border) |
| `ring` | `#5e6ad2` | `#aca2ff` | 0.757 0.132 287.7 | Anel de foco (= primary) |
| `chart-1` | `#5e6ad2` | `#6463cd` | 0.555 0.160 280.3 | Série 1 — a mais escura (matiz do primary) |
| `chart-2` | `#38bdf8` | `#d56817` | 0.637 0.160 50.1 | Série 2 |
| `chart-3` | `#34d399` | `#00c394` | 0.726 0.147 167.8 | Série 3 |
| `chart-4` | `#f43f5e` | `#dd9eff` | 0.794 0.148 313.1 | Série 4 |
| `chart-5` | `#fbbf24` | `#cae763` | 0.881 0.161 120.2 | Série 5 — a mais clara |
| `sidebar` | `#08090d` | `#0a0b15` | 0.154 0.021 279.2 | Sidebar (= background) |
| `sidebar-foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto da sidebar |
| `sidebar-primary` | `#5e6ad2` | `#aca2ff` | 0.757 0.132 287.7 | Item ativo da sidebar |
| `sidebar-primary-foreground` | `#ffffff` | `#15122b` | 0.201 0.049 286.6 | Texto sobre item ativo |
| `sidebar-accent` | `#151824` | `#1e202a` | 0.246 0.019 276.0 | Hover na sidebar (= card) |
| `sidebar-accent-foreground` | `#f2f4f8` | `#f2f3f9` | 0.965 0.008 278.6 | Texto no hover |
| `sidebar-border` | `#1e2233` | `#3b3e49` | 0.365 0.019 273.4 | Divisor da sidebar |
| `sidebar-ring` | `#5e6ad2` | `#aca2ff` | 0.757 0.132 287.7 | Foco na sidebar |
| `success` | — | `#7ce695` | 0.841 0.150 149.8 | **Novo** · status sucesso (texto/ícone/tint) |
| `success-foreground` | — | `#021c09` | 0.200 0.050 150.3 | **Novo** · texto sobre success sólido |
| `warning` | — | `#ffb948` | 0.832 0.148 75.7 | **Novo** · status aviso (substitui `warm`) |
| `warning-foreground` | — | `#231200` | 0.202 0.044 69.0 | **Novo** · texto sobre warning sólido |
| `info` | — | `#2bbdff` | 0.754 0.149 234.5 | **Novo** · status informativo |
| `info-foreground` | — | `#001929` | 0.203 0.046 238.9 | **Novo** · texto sobre info sólido |
| `alert` | `#f43f5e` | `#ff847d` | 0.750 0.151 24.7 | Status alerta (texto/ícone usa `alert`) |
| `alert-foreground` | `#ffffff` | `#290b0a` | 0.200 0.051 24.6 | Texto sobre alert sólido (escuro) |
| `brand-accent` | `#12967a` | `#5e6ad2` | 0.567 0.159 275.2 | Marca (monograma, AuthLayout) |
| `brand-muted` | `#d6d3ce` | `#d3d3dc` | 0.870 0.012 286.1 | Marca, forma secundária do monograma |

### 3.3 slate-cyan

| Token | Hex antigo | Hex novo | OKLCH (L C H) | Papel |
|---|---|---|---|---|
| `background` | `#0b0f17` | `#070f19` | 0.166 0.025 253.7 | Página (fundo do `<main>` e do shell) |
| `foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto principal |
| `muted` | `#111827` | `#101924` | 0.210 0.026 253.9 | surface-low: poço/recuo (trilho de switch/progresso, skeleton, input) |
| `card` | `#172033` | `#1a232f` | 0.253 0.026 255.8 | surface-container: **tile** da página |
| `card-foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto sobre card |
| `popover` | `#1f2b45` | `#252f3b` | 0.301 0.026 253.2 | surface-high: elemento interno do tile, menu, dialog |
| `popover-foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto sobre popover |
| `surface-highest` | `#2c3c5f` | `#303a47` | 0.345 0.027 255.1 | Hover/selecionado dentro de popover |
| `primary` | `#06b6d4` | `#3fbfcc` | 0.741 0.110 204.9 | Ação primária, item ativo, foco; legível como texto |
| `primary-foreground` | `#083344` | `#001b1f` | 0.203 0.035 208.0 | Texto sobre `bg-primary` sólido |
| `secondary` | `#1f2b45` | `#303a47` | 0.345 0.027 255.1 | Botão secundário (= surface-highest, visível sobre card e popover) |
| `secondary-foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto sobre secondary |
| `muted-foreground` | `#94a3b8` | `#9ca6b2` | 0.721 0.021 252.9 | Texto secundário (≥ 4.5 em todas as superfícies) |
| `accent` | `#172033` | `#303a47` | 0.345 0.027 255.1 | shadcn: fundo de hover/foco ghost/menu (= surface-highest). **Nunca marca.** |
| `accent-foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto sobre accent |
| `destructive` | `#f87171` | `#ff8c84` | 0.763 0.141 25.1 | Ação destrutiva (= alert) |
| `destructive-foreground` | — | `#290b0a` | 0.200 0.051 24.6 | Texto sobre destructive sólido |
| `border-subtle` | `#1f293d` | `#38424f` | 0.375 0.026 255.1 | Divisor/reforço de tile (L < border) |
| `border` | `#334155` | `#65707e` | 0.541 0.026 254.5 | Borda de componente interativo (≥ 3:1 vs card) |
| `input` | `#475569` | `#65707e` | 0.541 0.026 254.5 | Borda de input (= border) |
| `ring` | `#06b6d4` | `#3fbfcc` | 0.741 0.110 204.9 | Anel de foco (= primary) |
| `chart-1` | `#06b6d4` | `#00888f` | 0.570 0.097 201.2 | Série 1 — a mais escura (matiz do primary) |
| `chart-2` | `#3b82f6` | `#d66919` | 0.640 0.160 50.1 | Série 2 |
| `chart-3` | `#10b981` | `#9296ff` | 0.715 0.151 280.2 | Série 3 |
| `chart-4` | `#f43f5e` | `#c5c632` | 0.801 0.160 109.9 | Série 4 |
| `chart-5` | `#eab308` | `#41f9c7` | 0.880 0.160 169.8 | Série 5 — a mais clara |
| `sidebar` | `#0b0f17` | `#070f19` | 0.166 0.025 253.7 | Sidebar (= background) |
| `sidebar-foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto da sidebar |
| `sidebar-primary` | `#06b6d4` | `#3fbfcc` | 0.741 0.110 204.9 | Item ativo da sidebar |
| `sidebar-primary-foreground` | `#083344` | `#001b1f` | 0.203 0.035 208.0 | Texto sobre item ativo |
| `sidebar-accent` | `#172033` | `#1a232f` | 0.253 0.026 255.8 | Hover na sidebar (= card) |
| `sidebar-accent-foreground` | `#f8fafc` | `#f1f6fc` | 0.971 0.010 252.8 | Texto no hover |
| `sidebar-border` | `#1f293d` | `#38424f` | 0.375 0.026 255.1 | Divisor da sidebar |
| `sidebar-ring` | `#06b6d4` | `#3fbfcc` | 0.741 0.110 204.9 | Foco na sidebar |
| `success` | — | `#81eb9a` | 0.856 0.150 149.9 | **Novo** · status sucesso (texto/ícone/tint) |
| `success-foreground` | — | `#021c09` | 0.200 0.050 150.3 | **Novo** · texto sobre success sólido |
| `warning` | — | `#ffbd4b` | 0.840 0.147 77.7 | **Novo** · status aviso (substitui `warm`) |
| `warning-foreground` | — | `#231200` | 0.202 0.044 69.0 | **Novo** · texto sobre warning sólido |
| `info` | — | `#36c4ff` | 0.772 0.142 231.3 | **Novo** · status informativo |
| `info-foreground` | — | `#001929` | 0.203 0.046 238.9 | **Novo** · texto sobre info sólido |
| `alert` | `#ef4444` | `#ff8c84` | 0.763 0.141 25.1 | Status alerta (texto/ícone usa `alert`) |
| `alert-foreground` | `#ffffff` | `#290b0a` | 0.200 0.051 24.6 | Texto sobre alert sólido (escuro) |
| `brand-accent` | `#12967a` | `#06b6d4` | 0.715 0.126 215.2 | Marca (monograma, AuthLayout) |
| `brand-muted` | `#d6d3ce` | `#ccd7d8` | 0.871 0.012 203.5 | Marca, forma secundária do monograma |

### 3.4 github-dimmed

| Token | Hex antigo | Hex novo | OKLCH (L C H) | Papel |
|---|---|---|---|---|
| `background` | `#0d1117` | `#1c2128` | 0.246 0.015 256.8 | Página (fundo do `<main>` e do shell) |
| `foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto principal |
| `muted` | `#161b22` | `#252b32` | 0.286 0.015 252.4 | surface-low: poço/recuo (trilho de switch/progresso, skeleton, input) |
| `card` | `#21262d` | `#2f353d` | 0.326 0.016 255.6 | surface-container: **tile** da página |
| `card-foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto sobre card |
| `popover` | `#30363d` | `#393f47` | 0.365 0.016 255.6 | surface-high: elemento interno do tile, menu, dialog |
| `popover-foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto sobre popover |
| `surface-highest` | `#484f58` | `#444a52` | 0.407 0.016 255.6 | Hover/selecionado dentro de popover |
| `primary` | `#2f81f7` | `#9dceff` | 0.835 0.086 248.9 | Ação primária, item ativo, foco; legível como texto |
| `primary-foreground` | `#ffffff` | `#05162c` | 0.200 0.050 255.1 | Texto sobre `bg-primary` sólido |
| `secondary` | `#30363d` | `#444a52` | 0.407 0.016 255.6 | Botão secundário (= surface-highest, visível sobre card e popover) |
| `secondary-foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto sobre secondary |
| `muted-foreground` | `#8b949e` | `#b5bbc3` | 0.790 0.013 255.5 | Texto secundário (≥ 4.5 em todas as superfícies) |
| `accent` | `#21262d` | `#444a52` | 0.407 0.016 255.6 | shadcn: fundo de hover/foco ghost/menu (= surface-highest). **Nunca marca.** |
| `accent-foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto sobre accent |
| `destructive` | `#f85149` | `#ffb6ab` | 0.842 0.087 28.6 | Ação destrutiva (= alert) |
| `destructive-foreground` | — | `#290b09` | 0.200 0.051 26.5 | Texto sobre destructive sólido |
| `border-subtle` | `#21262d` | `#4c525a` | 0.436 0.015 255.6 | Divisor/reforço de tile (L < border) |
| `border` | `#30363d` | `#7a818a` | 0.600 0.016 254.7 | Borda de componente interativo (≥ 3:1 vs card) |
| `input` | `#3b434d` | `#7a818a` | 0.600 0.016 254.7 | Borda de input (= border) |
| `ring` | `#2f81f7` | `#9dceff` | 0.835 0.086 248.9 | Anel de foco (= primary) |
| `chart-1` | `#2f81f7` | `#2389e2` | 0.619 0.161 250.3 | Série 1 — a mais escura (matiz do primary) |
| `chart-2` | `#3fb950` | `#e6772e` | 0.685 0.160 49.8 | Série 2 |
| `chart-3` | `#d29922` | `#00cd9e` | 0.754 0.151 168.8 | Série 3 |
| `chart-4` | `#db61a2` | `#b4baff` | 0.809 0.098 280.1 | Série 4 |
| `chart-5` | `#a371f7` | `#ffd243` | 0.879 0.160 90.6 | Série 5 — a mais clara |
| `sidebar` | `#0d1117` | `#1c2128` | 0.246 0.015 256.8 | Sidebar (= background) |
| `sidebar-foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto da sidebar |
| `sidebar-primary` | `#2f81f7` | `#9dceff` | 0.835 0.086 248.9 | Item ativo da sidebar |
| `sidebar-primary-foreground` | `#ffffff` | `#05162c` | 0.200 0.050 255.1 | Texto sobre item ativo |
| `sidebar-accent` | `#161b22` | `#2f353d` | 0.326 0.016 255.6 | Hover na sidebar (= card) |
| `sidebar-accent-foreground` | `#e6edf3` | `#e5e8ec` | 0.930 0.006 255.5 | Texto no hover |
| `sidebar-border` | `#21262d` | `#4c525a` | 0.436 0.015 255.6 | Divisor da sidebar |
| `sidebar-ring` | `#2f81f7` | `#9dceff` | 0.835 0.086 248.9 | Foco na sidebar |
| `success` | — | `#82db82` | 0.814 0.150 144.0 | **Novo** · status sucesso (texto/ícone/tint) |
| `success-foreground` | — | `#061c06` | 0.202 0.051 143.4 | **Novo** · texto sobre success sólido |
| `warning` | — | `#fdbc44` | 0.835 0.150 78.9 | **Novo** · status aviso (substitui `warm`) |
| `warning-foreground` | — | `#221200` | 0.200 0.043 70.9 | **Novo** · texto sobre warning sólido |
| `info` | — | `#6cd4ff` | 0.824 0.114 227.6 | **Novo** · status informativo |
| `info-foreground` | — | `#001929` | 0.203 0.046 238.9 | **Novo** · texto sobre info sólido |
| `alert` | `#f85149` | `#ffb6ab` | 0.842 0.087 28.6 | Status alerta (texto/ícone usa `alert`) |
| `alert-foreground` | `#ffffff` | `#290b09` | 0.200 0.051 26.5 | Texto sobre alert sólido (escuro) |
| `brand-accent` | `#12967a` | `#316dca` | 0.545 0.157 259.1 | Marca (monograma, AuthLayout) |
| `brand-muted` | `#d6d3ce` | `#cfd5dc` | 0.870 0.012 252.1 | Marca, forma secundária do monograma |

### 3.5 contrast-safe-graphite

| Token | Hex antigo | Hex novo | OKLCH (L C H) | Papel |
|---|---|---|---|---|
| `background` | `#09090b` | `#0b0b0b` | 0.150 0.000 — | Página (fundo do `<main>` e do shell) |
| `foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto principal |
| `muted` | `#2b2b2b` | `#161616` | 0.200 0.000 — | surface-low: poço/recuo (trilho de switch/progresso, skeleton, input) |
| `card` | `#414141` | `#222222` | 0.252 0.000 — | surface-container: **tile** da página |
| `card-foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto sobre card |
| `popover` | `#575757` | `#2e2e2e` | 0.301 0.000 — | surface-high: elemento interno do tile, menu, dialog |
| `popover-foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto sobre popover |
| `surface-highest` | `#6d6d6d` | `#3a3a3a` | 0.348 0.000 — | Hover/selecionado dentro de popover |
| `primary` | `#5e6ad2` | `#f4b0ed` | 0.840 0.111 330.1 | Ação primária, item ativo, foco; legível como texto |
| `primary-foreground` | `#ffffff` | `#210e1f` | 0.200 0.043 331.0 | Texto sobre `bg-primary` sólido |
| `secondary` | `#414141` | `#3a3a3a` | 0.348 0.000 — | Botão secundário (= surface-highest, visível sobre card e popover) |
| `secondary-foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto sobre secondary |
| `muted-foreground` | `#acacac` | `#b6b6b6` | 0.776 0.000 — | Texto secundário (≥ 4.5 em todas as superfícies) |
| `accent` | `#414141` | `#3a3a3a` | 0.348 0.000 — | shadcn: fundo de hover/foco ghost/menu (= surface-highest). **Nunca marca.** |
| `accent-foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto sobre accent |
| `destructive` | `#dc2626` | `#ffaea6` | 0.827 0.096 25.6 | Ação destrutiva (= alert) |
| `destructive-foreground` | `#ffffff` | `#290b0a` | 0.200 0.051 24.6 | Texto sobre destructive sólido |
| `border-subtle` | `#8c8c8c` | `#424242` | 0.379 0.000 — | Divisor/reforço de tile (L < border) |
| `border` | `#6d6d6d` | `#797979` | 0.576 0.000 — | Borda de componente interativo (≥ 3:1 vs card) |
| `input` | `#6d6d6d` | `#797979` | 0.576 0.000 — | Borda de input (= border) |
| `ring` | `#5e6ad2` | `#f4b0ed` | 0.840 0.111 330.1 | Anel de foco (= primary) |
| `chart-1` | `#5e6ad2` | `#a75ab9` | 0.595 0.160 319.8 | Série 1 — a mais escura (matiz do primary) |
| `chart-2` | `#38bdf8` | `#df7126` | 0.666 0.160 49.9 | Série 2 |
| `chart-3` | `#10b981` | `#22c886` | 0.738 0.160 159.8 | Série 3 |
| `chart-4` | `#dc2626` | `#b1b8ff` | 0.803 0.101 279.5 | Série 4 |
| `chart-5` | `#fbbf24` | `#f0d947` | 0.879 0.160 100.1 | Série 5 — a mais clara |
| `sidebar` | `#09090b` | `#0b0b0b` | 0.150 0.000 — | Sidebar (= background) |
| `sidebar-foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto da sidebar |
| `sidebar-primary` | `#5e6ad2` | `#f4b0ed` | 0.840 0.111 330.1 | Item ativo da sidebar |
| `sidebar-primary-foreground` | `#ffffff` | `#210e1f` | 0.200 0.043 331.0 | Texto sobre item ativo |
| `sidebar-accent` | `#414141` | `#222222` | 0.252 0.000 — | Hover na sidebar (= card) |
| `sidebar-accent-foreground` | `#f4f4f5` | `#fafafa` | 0.985 0.000 — | Texto no hover |
| `sidebar-border` | `#6d6d6d` | `#424242` | 0.379 0.000 — | Divisor da sidebar |
| `sidebar-ring` | `#5e6ad2` | `#f4b0ed` | 0.840 0.111 330.1 | Foco na sidebar |
| `success` | — | `#95ffad` | 0.915 0.150 149.9 | **Novo** · status sucesso (texto/ícone/tint) |
| `success-foreground` | — | `#021c09` | 0.200 0.050 150.3 | **Novo** · texto sobre success sólido |
| `warning` | — | `#ffd17b` | 0.883 0.117 81.9 | **Novo** · status aviso (substitui `warm`) |
| `warning-foreground` | — | `#231200` | 0.202 0.044 69.0 | **Novo** · texto sobre warning sólido |
| `info` | — | `#7bd8ff` | 0.839 0.104 227.3 | **Novo** · status informativo |
| `info-foreground` | — | `#001929` | 0.203 0.046 238.9 | **Novo** · texto sobre info sólido |
| `alert` | `#dc2626` | `#ffaea6` | 0.827 0.096 25.6 | Status alerta (texto/ícone usa `alert`) |
| `alert-foreground` | `#ffffff` | `#290b0a` | 0.200 0.051 24.6 | Texto sobre alert sólido (escuro) |
| `brand-accent` | `#12967a` | `#b464ae` | 0.620 0.140 329.9 | Marca (monograma, AuthLayout) |
| `brand-muted` | `#d6d3ce` | `#d9d1d8` | 0.869 0.013 329.6 | Marca, forma secundária do monograma |

---

## 4. Verificação — `scripts/theme-contrast-check.mjs`

```text
npm run check:theme                               # index.css atual
npm run check:theme -- docs/theme-proposal.md     # blocos css deste documento
npm run check:theme -- <arquivo.css> --inventory  # + tabela hex/OKLCH por preset
```

O script sai com código ≠ 0 se qualquer checagem falhar. Ele cobre:

- Texto: `foreground` / `muted-foreground` × 5 superfícies, pares `*-foreground`.
- Primary e status como texto: sobre card, popover e tint `/15` composto sobre card e popover.
- Sólidos: `*-foreground` sobre o próprio sólido, e hover/active (`/90`, `/80`) compostos sobre card.
- Bordas e foco.
- Escada: ordem, balanceamento, ΔL tile × página, `accent` acima de `popover`.
- Status: faixa de L ≤ 0.15 (podem se separar por L, na mesma banda visual).
- Charts: ≥ 3:1 vs card; escada de L crescente chart-1 → chart-5 com passos ≈ iguais (maior/menor ≤ 1.5); ΔE00 ≥ 12 entre qualquer par sob normal, deuteranopia, protanopia e **tritanopia** (alvo 15 marcado como "alvo ✓").
- **Metas informativas (não reprovam):** ΔE00 mínimo entre status e matriz de ΔE00 entre os `primary` de presets, nas 4 visões.
- Unicidade de `brand-*` / `primary` entre presets, e mapeamento no `@theme inline`.

**Baseline (`index.css` atual)** — ainda **não** entra no `npm run lint` porque o CSS atual falha:

- zinc-minimalist — ❌ 33 falha(s) (67 checagens)
- indigo — ❌ 33 falha(s) (67 checagens)
- slate-cyan — ❌ 31 falha(s) (67 checagens)
- github-dimmed — ❌ 38 falha(s) (67 checagens)
- contrast-safe-graphite — ❌ 35 falha(s) (66 checagens)
- Entre presets
- Metas informativas (não reprovam)
- ❌ 180 falha(s).

**Proposta (saída completa):**


#### zinc-minimalist — ✅ 0 falhas (73 checagens)

| Grupo | Checagem | Valor | |
|---|---|---|---|
| texto | foreground vs background (≥ 4.5) | 17.75 | ✅ |
| texto | foreground vs muted (≥ 4.5) | 16.35 | ✅ |
| texto | foreground vs card (≥ 4.5) | 14.67 | ✅ |
| texto | foreground vs popover (≥ 4.5) | 12.72 | ✅ |
| texto | foreground vs surface-highest (≥ 4.5) | 10.71 | ✅ |
| texto | muted-foreground vs background (≥ 4.5) | 7.70 | ✅ |
| texto | muted-foreground vs muted (≥ 4.5) | 7.09 | ✅ |
| texto | muted-foreground vs card (≥ 4.5) | 6.37 | ✅ |
| texto | muted-foreground vs popover (≥ 4.5) | 5.52 | ✅ |
| texto | muted-foreground vs surface-highest (≥ 4.5) | 4.64 | ✅ |
| texto | card-foreground vs card (≥ 4.5) | 14.67 | ✅ |
| texto | popover-foreground vs popover (≥ 4.5) | 12.72 | ✅ |
| texto | secondary-foreground vs secondary (≥ 4.5) | 10.71 | ✅ |
| texto | accent-foreground vs accent (≥ 4.5) | 10.71 | ✅ |
| texto | sidebar-foreground vs sidebar (≥ 4.5) | 17.75 | ✅ |
| texto | sidebar-accent-foreground vs sidebar-accent (≥ 4.5) | 14.67 | ✅ |
| primary como texto | primary vs card (≥ 4.5) | 7.38 | ✅ |
| primary como texto | primary vs popover (≥ 4.5) | 6.40 | ✅ |
| primary como texto | primary vs primary/15 sobre card (≥ 4.5) | 5.54 | ✅ |
| primary como texto | primary vs primary/15 sobre popover (≥ 4.5) | 4.83 | ✅ |
| success como texto | success vs card (≥ 4.5) | 10.49 | ✅ |
| success como texto | success vs popover (≥ 4.5) | 9.10 | ✅ |
| success como texto | success vs success/15 sobre card (≥ 4.5) | 7.26 | ✅ |
| success como texto | success vs success/15 sobre popover (≥ 4.5) | 6.31 | ✅ |
| warning como texto | warning vs card (≥ 4.5) | 9.31 | ✅ |
| warning como texto | warning vs popover (≥ 4.5) | 8.07 | ✅ |
| warning como texto | warning vs warning/15 sobre card (≥ 4.5) | 6.63 | ✅ |
| warning como texto | warning vs warning/15 sobre popover (≥ 4.5) | 5.77 | ✅ |
| info como texto | info vs card (≥ 4.5) | 7.86 | ✅ |
| info como texto | info vs popover (≥ 4.5) | 6.81 | ✅ |
| info como texto | info vs info/15 sobre card (≥ 4.5) | 5.87 | ✅ |
| info como texto | info vs info/15 sobre popover (≥ 4.5) | 5.12 | ✅ |
| alert como texto | alert vs card (≥ 4.5) | 6.98 | ✅ |
| alert como texto | alert vs popover (≥ 4.5) | 6.05 | ✅ |
| alert como texto | alert vs alert/15 sobre card (≥ 4.5) | 5.36 | ✅ |
| alert como texto | alert vs alert/15 sobre popover (≥ 4.5) | 4.62 | ✅ |
| destructive como texto | destructive vs card (≥ 4.5) | 6.98 | ✅ |
| destructive como texto | destructive vs popover (≥ 4.5) | 6.05 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre card (≥ 4.5) | 5.36 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre popover (≥ 4.5) | 4.62 | ✅ |
| sólido | primary-foreground vs primary (≥ 4.5) | 8.18 | ✅ |
| sólido | sidebar-primary-foreground vs sidebar-primary (≥ 4.5) | 8.18 | ✅ |
| sólido | success-foreground vs success (≥ 4.5) | 11.73 | ✅ |
| sólido | warning-foreground vs warning (≥ 4.5) | 10.53 | ✅ |
| sólido | info-foreground vs info (≥ 4.5) | 8.80 | ✅ |
| sólido | alert-foreground vs alert (≥ 4.5) | 7.98 | ✅ |
| sólido | destructive-foreground vs destructive (≥ 4.5) | 7.98 | ✅ |
| sólido | primary-foreground vs primary/90 sobre card (≥ 4.5) | 6.94 | ✅ |
| sólido | primary-foreground vs primary/80 sobre card (≥ 4.5) | 5.76 | ✅ |
| sólido | destructive-foreground vs destructive/90 sobre card (≥ 4.5) | 6.77 | ✅ |
| sólido | destructive-foreground vs destructive/80 sobre card (≥ 4.5) | 5.64 | ✅ |
| bordas e foco | border vs card (≥ 3) | 3.11 | ✅ |
| bordas e foco | input vs card (≥ 3) | 3.11 | ✅ |
| bordas e foco | ring vs background (≥ 3) | 8.93 | ✅ |
| bordas e foco | ring vs card (≥ 3) | 7.38 | ✅ |
| bordas e foco | brand-accent vs background (≥ 3) | 5.23 | ✅ |
| bordas e foco | L(border-subtle) < L(border) | 0.372 < 0.535 | ✅ |
| escada | L crescente bg < muted < card < popover < highest | 0.045 / 0.043 / 0.045 / 0.047 | ✅ |
| escada | maior/menor degrau ΔL (≤ 1.5) | 1.08 | ✅ |
| escada | ΔL tile (card) × página (background) (≥ 0.08) | 0.088 | ✅ |
| escada | accent acima de popover (≠ card, ≠ popover) | ΔL 0.047 | ✅ |
| semânticos | faixa de L dos status (spread ≤ 0.15) | 0.086 | ✅ |
| charts | chart-1 vs card (≥ 3) | 3.72 | ✅ |
| charts | chart-2 vs card (≥ 3) | 4.38 | ✅ |
| charts | chart-3 vs card (≥ 3) | 6.61 | ✅ |
| charts | chart-4 vs card (≥ 3) | 8.35 | ✅ |
| charts | chart-5 vs card (≥ 3) | 10.48 | ✅ |
| charts | escada de L crescente chart-1 (escuro) → chart-5 (claro) | 0.562 → 0.639 → 0.721 → 0.795 → 0.866 | ✅ |
| charts | passos de L ≈ iguais (maior/menor ≤ 1.5) | 1.13 | ✅ |
| charts | ΔE00 mínimo normal (≥ 12; alvo 15) | 27.3 (1×3) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo deuteranopia (≥ 12; alvo 15) | 18.0 (3×5) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo protanopia (≥ 12; alvo 15) | 19.3 (3×5) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo tritanopia (≥ 12; alvo 15) | 18.2 (3×5) · alvo ✓ | ✅ |

#### indigo — ✅ 0 falhas (73 checagens)

| Grupo | Checagem | Valor | |
|---|---|---|---|
| texto | foreground vs background (≥ 4.5) | 17.70 | ✅ |
| texto | foreground vs muted (≥ 4.5) | 16.39 | ✅ |
| texto | foreground vs card (≥ 4.5) | 14.64 | ✅ |
| texto | foreground vs popover (≥ 4.5) | 12.72 | ✅ |
| texto | foreground vs surface-highest (≥ 4.5) | 10.84 | ✅ |
| texto | muted-foreground vs background (≥ 4.5) | 7.62 | ✅ |
| texto | muted-foreground vs muted (≥ 4.5) | 7.06 | ✅ |
| texto | muted-foreground vs card (≥ 4.5) | 6.31 | ✅ |
| texto | muted-foreground vs popover (≥ 4.5) | 5.48 | ✅ |
| texto | muted-foreground vs surface-highest (≥ 4.5) | 4.67 | ✅ |
| texto | card-foreground vs card (≥ 4.5) | 14.64 | ✅ |
| texto | popover-foreground vs popover (≥ 4.5) | 12.72 | ✅ |
| texto | secondary-foreground vs secondary (≥ 4.5) | 10.84 | ✅ |
| texto | accent-foreground vs accent (≥ 4.5) | 10.84 | ✅ |
| texto | sidebar-foreground vs sidebar (≥ 4.5) | 17.70 | ✅ |
| texto | sidebar-accent-foreground vs sidebar-accent (≥ 4.5) | 14.64 | ✅ |
| primary como texto | primary vs card (≥ 4.5) | 7.23 | ✅ |
| primary como texto | primary vs popover (≥ 4.5) | 6.28 | ✅ |
| primary como texto | primary vs primary/15 sobre card (≥ 4.5) | 5.41 | ✅ |
| primary como texto | primary vs primary/15 sobre popover (≥ 4.5) | 4.70 | ✅ |
| success como texto | success vs card (≥ 4.5) | 10.51 | ✅ |
| success como texto | success vs popover (≥ 4.5) | 9.13 | ✅ |
| success como texto | success vs success/15 sobre card (≥ 4.5) | 7.33 | ✅ |
| success como texto | success vs success/15 sobre popover (≥ 4.5) | 6.38 | ✅ |
| warning como texto | warning vs card (≥ 4.5) | 9.48 | ✅ |
| warning como texto | warning vs popover (≥ 4.5) | 8.24 | ✅ |
| warning como texto | warning vs warning/15 sobre card (≥ 4.5) | 6.80 | ✅ |
| warning como texto | warning vs warning/15 sobre popover (≥ 4.5) | 5.92 | ✅ |
| info como texto | info vs card (≥ 4.5) | 7.59 | ✅ |
| info como texto | info vs popover (≥ 4.5) | 6.59 | ✅ |
| info como texto | info vs info/15 sobre card (≥ 4.5) | 5.69 | ✅ |
| info como texto | info vs info/15 sobre popover (≥ 4.5) | 4.97 | ✅ |
| alert como texto | alert vs card (≥ 4.5) | 6.83 | ✅ |
| alert como texto | alert vs popover (≥ 4.5) | 5.93 | ✅ |
| alert como texto | alert vs alert/15 sobre card (≥ 4.5) | 5.27 | ✅ |
| alert como texto | alert vs alert/15 sobre popover (≥ 4.5) | 4.60 | ✅ |
| destructive como texto | destructive vs card (≥ 4.5) | 6.83 | ✅ |
| destructive como texto | destructive vs popover (≥ 4.5) | 5.93 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre card (≥ 4.5) | 5.27 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre popover (≥ 4.5) | 4.60 | ✅ |
| sólido | primary-foreground vs primary (≥ 4.5) | 8.12 | ✅ |
| sólido | sidebar-primary-foreground vs sidebar-primary (≥ 4.5) | 8.12 | ✅ |
| sólido | success-foreground vs success (≥ 4.5) | 11.61 | ✅ |
| sólido | warning-foreground vs warning (≥ 4.5) | 10.61 | ✅ |
| sólido | info-foreground vs info (≥ 4.5) | 8.39 | ✅ |
| sólido | alert-foreground vs alert (≥ 4.5) | 7.72 | ✅ |
| sólido | destructive-foreground vs destructive (≥ 4.5) | 7.72 | ✅ |
| sólido | primary-foreground vs primary/90 sobre card (≥ 4.5) | 6.89 | ✅ |
| sólido | primary-foreground vs primary/80 sobre card (≥ 4.5) | 5.77 | ✅ |
| sólido | destructive-foreground vs destructive/90 sobre card (≥ 4.5) | 6.55 | ✅ |
| sólido | destructive-foreground vs destructive/80 sobre card (≥ 4.5) | 5.47 | ✅ |
| bordas e foco | border vs card (≥ 3) | 3.11 | ✅ |
| bordas e foco | input vs card (≥ 3) | 3.11 | ✅ |
| bordas e foco | ring vs background (≥ 3) | 8.74 | ✅ |
| bordas e foco | ring vs card (≥ 3) | 7.23 | ✅ |
| bordas e foco | brand-accent vs background (≥ 3) | 4.17 | ✅ |
| bordas e foco | L(border-subtle) < L(border) | 0.365 < 0.534 | ✅ |
| escada | L crescente bg < muted < card < popover < highest | 0.046 / 0.046 / 0.045 / 0.044 | ✅ |
| escada | maior/menor degrau ΔL (≤ 1.5) | 1.05 | ✅ |
| escada | ΔL tile (card) × página (background) (≥ 0.08) | 0.092 | ✅ |
| escada | accent acima de popover (≠ card, ≠ popover) | ΔL 0.044 | ✅ |
| semânticos | faixa de L dos status (spread ≤ 0.15) | 0.091 | ✅ |
| charts | chart-1 vs card (≥ 3) | 3.25 | ✅ |
| charts | chart-2 vs card (≥ 3) | 4.49 | ✅ |
| charts | chart-3 vs card (≥ 3) | 7.13 | ✅ |
| charts | chart-4 vs card (≥ 3) | 8.04 | ✅ |
| charts | chart-5 vs card (≥ 3) | 11.67 | ✅ |
| charts | escada de L crescente chart-1 (escuro) → chart-5 (claro) | 0.555 → 0.637 → 0.726 → 0.794 → 0.881 | ✅ |
| charts | passos de L ≈ iguais (maior/menor ≤ 1.5) | 1.30 | ✅ |
| charts | ΔE00 mínimo normal (≥ 12; alvo 15) | 26.3 (3×5) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo deuteranopia (≥ 12; alvo 15) | 19.9 (3×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo protanopia (≥ 12; alvo 15) | 20.9 (1×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo tritanopia (≥ 12; alvo 15) | 25.0 (2×4) · alvo ✓ | ✅ |

#### slate-cyan — ✅ 0 falhas (73 checagens)

| Grupo | Checagem | Valor | |
|---|---|---|---|
| texto | foreground vs background (≥ 4.5) | 17.71 | ✅ |
| texto | foreground vs muted (≥ 4.5) | 16.29 | ✅ |
| texto | foreground vs card (≥ 4.5) | 14.58 | ✅ |
| texto | foreground vs popover (≥ 4.5) | 12.48 | ✅ |
| texto | foreground vs surface-highest (≥ 4.5) | 10.61 | ✅ |
| texto | muted-foreground vs background (≥ 4.5) | 7.80 | ✅ |
| texto | muted-foreground vs muted (≥ 4.5) | 7.17 | ✅ |
| texto | muted-foreground vs card (≥ 4.5) | 6.42 | ✅ |
| texto | muted-foreground vs popover (≥ 4.5) | 5.50 | ✅ |
| texto | muted-foreground vs surface-highest (≥ 4.5) | 4.67 | ✅ |
| texto | card-foreground vs card (≥ 4.5) | 14.58 | ✅ |
| texto | popover-foreground vs popover (≥ 4.5) | 12.48 | ✅ |
| texto | secondary-foreground vs secondary (≥ 4.5) | 10.61 | ✅ |
| texto | accent-foreground vs accent (≥ 4.5) | 10.61 | ✅ |
| texto | sidebar-foreground vs sidebar (≥ 4.5) | 17.71 | ✅ |
| texto | sidebar-accent-foreground vs sidebar-accent (≥ 4.5) | 14.58 | ✅ |
| primary como texto | primary vs card (≥ 4.5) | 7.19 | ✅ |
| primary como texto | primary vs popover (≥ 4.5) | 6.16 | ✅ |
| primary como texto | primary vs primary/15 sobre card (≥ 4.5) | 5.43 | ✅ |
| primary como texto | primary vs primary/15 sobre popover (≥ 4.5) | 4.62 | ✅ |
| success como texto | success vs card (≥ 4.5) | 10.78 | ✅ |
| success como texto | success vs popover (≥ 4.5) | 9.22 | ✅ |
| success como texto | success vs success/15 sobre card (≥ 4.5) | 7.43 | ✅ |
| success como texto | success vs success/15 sobre popover (≥ 4.5) | 6.37 | ✅ |
| warning como texto | warning vs card (≥ 4.5) | 9.53 | ✅ |
| warning como texto | warning vs popover (≥ 4.5) | 8.16 | ✅ |
| warning como texto | warning vs warning/15 sobre card (≥ 4.5) | 6.85 | ✅ |
| warning como texto | warning vs warning/15 sobre popover (≥ 4.5) | 5.86 | ✅ |
| info como texto | info vs card (≥ 4.5) | 7.92 | ✅ |
| info como texto | info vs popover (≥ 4.5) | 6.78 | ✅ |
| info como texto | info vs info/15 sobre card (≥ 4.5) | 5.86 | ✅ |
| info como texto | info vs info/15 sobre popover (≥ 4.5) | 5.04 | ✅ |
| alert como texto | alert vs card (≥ 4.5) | 7.04 | ✅ |
| alert como texto | alert vs popover (≥ 4.5) | 6.03 | ✅ |
| alert como texto | alert vs alert/15 sobre card (≥ 4.5) | 5.39 | ✅ |
| alert como texto | alert vs alert/15 sobre popover (≥ 4.5) | 4.63 | ✅ |
| destructive como texto | destructive vs card (≥ 4.5) | 7.04 | ✅ |
| destructive como texto | destructive vs popover (≥ 4.5) | 6.03 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre card (≥ 4.5) | 5.39 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre popover (≥ 4.5) | 4.63 | ✅ |
| sólido | primary-foreground vs primary (≥ 4.5) | 8.10 | ✅ |
| sólido | sidebar-primary-foreground vs sidebar-primary (≥ 4.5) | 8.10 | ✅ |
| sólido | success-foreground vs success (≥ 4.5) | 12.18 | ✅ |
| sólido | warning-foreground vs warning (≥ 4.5) | 10.91 | ✅ |
| sólido | info-foreground vs info (≥ 4.5) | 8.96 | ✅ |
| sólido | alert-foreground vs alert (≥ 4.5) | 8.14 | ✅ |
| sólido | destructive-foreground vs destructive (≥ 4.5) | 8.14 | ✅ |
| sólido | primary-foreground vs primary/90 sobre card (≥ 4.5) | 6.84 | ✅ |
| sólido | primary-foreground vs primary/80 sobre card (≥ 4.5) | 5.78 | ✅ |
| sólido | destructive-foreground vs destructive/90 sobre card (≥ 4.5) | 6.90 | ✅ |
| sólido | destructive-foreground vs destructive/80 sobre card (≥ 4.5) | 5.75 | ✅ |
| bordas e foco | border vs card (≥ 3) | 3.15 | ✅ |
| bordas e foco | input vs card (≥ 3) | 3.15 | ✅ |
| bordas e foco | ring vs background (≥ 3) | 8.74 | ✅ |
| bordas e foco | ring vs card (≥ 3) | 7.19 | ✅ |
| bordas e foco | brand-accent vs background (≥ 3) | 7.93 | ✅ |
| bordas e foco | L(border-subtle) < L(border) | 0.375 < 0.541 | ✅ |
| escada | L crescente bg < muted < card < popover < highest | 0.044 / 0.043 / 0.048 / 0.044 | ✅ |
| escada | maior/menor degrau ΔL (≤ 1.5) | 1.12 | ✅ |
| escada | ΔL tile (card) × página (background) (≥ 0.08) | 0.087 | ✅ |
| escada | accent acima de popover (≠ card, ≠ popover) | ΔL 0.044 | ✅ |
| semânticos | faixa de L dos status (spread ≤ 0.15) | 0.093 | ✅ |
| charts | chart-1 vs card (≥ 3) | 3.71 | ✅ |
| charts | chart-2 vs card (≥ 3) | 4.45 | ✅ |
| charts | chart-3 vs card (≥ 3) | 6.06 | ✅ |
| charts | chart-4 vs card (≥ 3) | 8.68 | ✅ |
| charts | chart-5 vs card (≥ 3) | 11.77 | ✅ |
| charts | escada de L crescente chart-1 (escuro) → chart-5 (claro) | 0.570 → 0.640 → 0.715 → 0.801 → 0.880 | ✅ |
| charts | passos de L ≈ iguais (maior/menor ≤ 1.5) | 1.23 | ✅ |
| charts | ΔE00 mínimo normal (≥ 12; alvo 15) | 30.8 (4×5) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo deuteranopia (≥ 12; alvo 15) | 18.1 (2×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo protanopia (≥ 12; alvo 15) | 20.7 (1×3) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo tritanopia (≥ 12; alvo 15) | 19.7 (1×3) · alvo ✓ | ✅ |

#### github-dimmed — ✅ 0 falhas (73 checagens)

| Grupo | Checagem | Valor | |
|---|---|---|---|
| texto | foreground vs background (≥ 4.5) | 13.17 | ✅ |
| texto | foreground vs muted (≥ 4.5) | 11.62 | ✅ |
| texto | foreground vs card (≥ 4.5) | 10.07 | ✅ |
| texto | foreground vs popover (≥ 4.5) | 8.65 | ✅ |
| texto | foreground vs surface-highest (≥ 4.5) | 7.28 | ✅ |
| texto | muted-foreground vs background (≥ 4.5) | 8.37 | ✅ |
| texto | muted-foreground vs muted (≥ 4.5) | 7.39 | ✅ |
| texto | muted-foreground vs card (≥ 4.5) | 6.40 | ✅ |
| texto | muted-foreground vs popover (≥ 4.5) | 5.50 | ✅ |
| texto | muted-foreground vs surface-highest (≥ 4.5) | 4.63 | ✅ |
| texto | card-foreground vs card (≥ 4.5) | 10.07 | ✅ |
| texto | popover-foreground vs popover (≥ 4.5) | 8.65 | ✅ |
| texto | secondary-foreground vs secondary (≥ 4.5) | 7.28 | ✅ |
| texto | accent-foreground vs accent (≥ 4.5) | 7.28 | ✅ |
| texto | sidebar-foreground vs sidebar (≥ 4.5) | 13.17 | ✅ |
| texto | sidebar-accent-foreground vs sidebar-accent (≥ 4.5) | 10.07 | ✅ |
| primary como texto | primary vs card (≥ 4.5) | 7.49 | ✅ |
| primary como texto | primary vs popover (≥ 4.5) | 6.43 | ✅ |
| primary como texto | primary vs primary/15 sobre card (≥ 4.5) | 5.30 | ✅ |
| primary como texto | primary vs primary/15 sobre popover (≥ 4.5) | 4.66 | ✅ |
| success como texto | success vs card (≥ 4.5) | 7.31 | ✅ |
| success como texto | success vs popover (≥ 4.5) | 6.28 | ✅ |
| success como texto | success vs success/15 sobre card (≥ 4.5) | 5.24 | ✅ |
| success como texto | success vs success/15 sobre popover (≥ 4.5) | 4.61 | ✅ |
| warning como texto | warning vs card (≥ 4.5) | 7.34 | ✅ |
| warning como texto | warning vs popover (≥ 4.5) | 6.30 | ✅ |
| warning como texto | warning vs warning/15 sobre card (≥ 4.5) | 5.31 | ✅ |
| warning como texto | warning vs warning/15 sobre popover (≥ 4.5) | 4.62 | ✅ |
| info como texto | info vs card (≥ 4.5) | 7.36 | ✅ |
| info como texto | info vs popover (≥ 4.5) | 6.33 | ✅ |
| info como texto | info vs info/15 sobre card (≥ 4.5) | 5.26 | ✅ |
| info como texto | info vs info/15 sobre popover (≥ 4.5) | 4.62 | ✅ |
| alert como texto | alert vs card (≥ 4.5) | 7.38 | ✅ |
| alert como texto | alert vs popover (≥ 4.5) | 6.34 | ✅ |
| alert como texto | alert vs alert/15 sobre card (≥ 4.5) | 5.31 | ✅ |
| alert como texto | alert vs alert/15 sobre popover (≥ 4.5) | 4.61 | ✅ |
| destructive como texto | destructive vs card (≥ 4.5) | 7.38 | ✅ |
| destructive como texto | destructive vs popover (≥ 4.5) | 6.34 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre card (≥ 4.5) | 5.31 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre popover (≥ 4.5) | 4.61 | ✅ |
| sólido | primary-foreground vs primary (≥ 4.5) | 10.98 | ✅ |
| sólido | sidebar-primary-foreground vs sidebar-primary (≥ 4.5) | 10.98 | ✅ |
| sólido | success-foreground vs success (≥ 4.5) | 10.54 | ✅ |
| sólido | warning-foreground vs warning (≥ 4.5) | 10.79 | ✅ |
| sólido | info-foreground vs info (≥ 4.5) | 10.67 | ✅ |
| sólido | alert-foreground vs alert (≥ 4.5) | 10.93 | ✅ |
| sólido | destructive-foreground vs destructive (≥ 4.5) | 10.93 | ✅ |
| sólido | primary-foreground vs primary/90 sobre card (≥ 4.5) | 9.40 | ✅ |
| sólido | primary-foreground vs primary/80 sobre card (≥ 4.5) | 7.91 | ✅ |
| sólido | destructive-foreground vs destructive/90 sobre card (≥ 4.5) | 9.32 | ✅ |
| sólido | destructive-foreground vs destructive/80 sobre card (≥ 4.5) | 7.87 | ✅ |
| bordas e foco | border vs card (≥ 3) | 3.14 | ✅ |
| bordas e foco | input vs card (≥ 3) | 3.14 | ✅ |
| bordas e foco | ring vs background (≥ 3) | 9.79 | ✅ |
| bordas e foco | ring vs card (≥ 3) | 7.49 | ✅ |
| bordas e foco | brand-accent vs background (≥ 3) | 3.21 | ✅ |
| bordas e foco | L(border-subtle) < L(border) | 0.436 < 0.600 | ✅ |
| escada | L crescente bg < muted < card < popover < highest | 0.040 / 0.040 / 0.039 / 0.041 | ✅ |
| escada | maior/menor degrau ΔL (≤ 1.5) | 1.07 | ✅ |
| escada | ΔL tile (card) × página (background) (≥ 0.08) | 0.081 | ✅ |
| escada | accent acima de popover (≠ card, ≠ popover) | ΔL 0.041 | ✅ |
| semânticos | faixa de L dos status (spread ≤ 0.15) | 0.028 | ✅ |
| charts | chart-1 vs card (≥ 3) | 3.39 | ✅ |
| charts | chart-2 vs card (≥ 3) | 4.15 | ✅ |
| charts | chart-3 vs card (≥ 3) | 6.02 | ✅ |
| charts | chart-4 vs card (≥ 3) | 6.72 | ✅ |
| charts | chart-5 vs card (≥ 3) | 8.57 | ✅ |
| charts | escada de L crescente chart-1 (escuro) → chart-5 (claro) | 0.619 → 0.685 → 0.754 → 0.809 → 0.879 | ✅ |
| charts | passos de L ≈ iguais (maior/menor ≤ 1.5) | 1.26 | ✅ |
| charts | ΔE00 mínimo normal (≥ 12; alvo 15) | 22.7 (1×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo deuteranopia (≥ 12; alvo 15) | 18.0 (3×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo protanopia (≥ 12; alvo 15) | 16.9 (1×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo tritanopia (≥ 12; alvo 15) | 16.9 (2×5) · alvo ✓ | ✅ |

#### contrast-safe-graphite — ✅ 0 falhas (73 checagens)

| Grupo | Checagem | Valor | |
|---|---|---|---|
| texto | foreground vs background (≥ 4.5) | 18.86 | ✅ |
| texto | foreground vs muted (≥ 4.5) | 17.34 | ✅ |
| texto | foreground vs card (≥ 4.5) | 15.24 | ✅ |
| texto | foreground vs popover (≥ 4.5) | 13.01 | ✅ |
| texto | foreground vs surface-highest (≥ 4.5) | 10.90 | ✅ |
| texto | muted-foreground vs background (≥ 4.5) | 9.71 | ✅ |
| texto | muted-foreground vs muted (≥ 4.5) | 8.92 | ✅ |
| texto | muted-foreground vs card (≥ 4.5) | 7.85 | ✅ |
| texto | muted-foreground vs popover (≥ 4.5) | 6.70 | ✅ |
| texto | muted-foreground vs surface-highest (≥ 4.5) | 5.61 | ✅ |
| texto | card-foreground vs card (≥ 4.5) | 15.24 | ✅ |
| texto | popover-foreground vs popover (≥ 4.5) | 13.01 | ✅ |
| texto | secondary-foreground vs secondary (≥ 4.5) | 10.90 | ✅ |
| texto | accent-foreground vs accent (≥ 4.5) | 10.90 | ✅ |
| texto | sidebar-foreground vs sidebar (≥ 4.5) | 18.86 | ✅ |
| texto | sidebar-accent-foreground vs sidebar-accent (≥ 4.5) | 15.24 | ✅ |
| primary como texto | primary vs card (≥ 4.5) | 9.30 | ✅ |
| primary como texto | primary vs popover (≥ 4.5) | 7.94 | ✅ |
| primary como texto | primary vs primary/15 sobre card (≥ 4.5) | 6.63 | ✅ |
| primary como texto | primary vs primary/15 sobre popover (≥ 4.5) | 5.61 | ✅ |
| success como texto | success vs card (≥ 4.5) | 13.02 | ✅ |
| success como texto | success vs popover (≥ 4.5) | 11.11 | ✅ |
| success como texto | success vs success/15 sobre card (≥ 4.5) | 8.60 | ✅ |
| success como texto | success vs success/15 sobre popover (≥ 4.5) | 7.36 | ✅ |
| warning como texto | warning vs card (≥ 4.5) | 11.11 | ✅ |
| warning como texto | warning vs popover (≥ 4.5) | 9.48 | ✅ |
| warning como texto | warning vs warning/15 sobre card (≥ 4.5) | 7.61 | ✅ |
| warning como texto | warning vs warning/15 sobre popover (≥ 4.5) | 6.51 | ✅ |
| info como texto | info vs card (≥ 4.5) | 9.93 | ✅ |
| info como texto | info vs popover (≥ 4.5) | 8.48 | ✅ |
| info como texto | info vs info/15 sobre card (≥ 4.5) | 7.01 | ✅ |
| info como texto | info vs info/15 sobre popover (≥ 4.5) | 5.92 | ✅ |
| alert como texto | alert vs card (≥ 4.5) | 8.98 | ✅ |
| alert como texto | alert vs popover (≥ 4.5) | 7.67 | ✅ |
| alert como texto | alert vs alert/15 sobre card (≥ 4.5) | 6.45 | ✅ |
| alert como texto | alert vs alert/15 sobre popover (≥ 4.5) | 5.53 | ✅ |
| destructive como texto | destructive vs card (≥ 4.5) | 8.98 | ✅ |
| destructive como texto | destructive vs popover (≥ 4.5) | 7.67 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre card (≥ 4.5) | 6.45 | ✅ |
| destructive como texto | destructive vs destructive/15 sobre popover (≥ 4.5) | 5.53 | ✅ |
| sólido | primary-foreground vs primary (≥ 4.5) | 10.70 | ✅ |
| sólido | sidebar-primary-foreground vs sidebar-primary (≥ 4.5) | 10.70 | ✅ |
| sólido | success-foreground vs success (≥ 4.5) | 14.66 | ✅ |
| sólido | warning-foreground vs warning (≥ 4.5) | 12.66 | ✅ |
| sólido | info-foreground vs info (≥ 4.5) | 11.19 | ✅ |
| sólido | alert-foreground vs alert (≥ 4.5) | 10.34 | ✅ |
| sólido | destructive-foreground vs destructive (≥ 4.5) | 10.34 | ✅ |
| sólido | primary-foreground vs primary/90 sobre card (≥ 4.5) | 8.98 | ✅ |
| sólido | primary-foreground vs primary/80 sobre card (≥ 4.5) | 7.45 | ✅ |
| sólido | destructive-foreground vs destructive/90 sobre card (≥ 4.5) | 8.68 | ✅ |
| sólido | destructive-foreground vs destructive/80 sobre card (≥ 4.5) | 7.20 | ✅ |
| bordas e foco | border vs card (≥ 3) | 3.65 | ✅ |
| bordas e foco | input vs card (≥ 3) | 3.65 | ✅ |
| bordas e foco | ring vs background (≥ 3) | 11.51 | ✅ |
| bordas e foco | ring vs card (≥ 3) | 9.30 | ✅ |
| bordas e foco | brand-accent vs background (≥ 3) | 5.04 | ✅ |
| bordas e foco | L(border-subtle) < L(border) | 0.379 < 0.576 | ✅ |
| escada | L crescente bg < muted < card < popover < highest | 0.051 / 0.052 / 0.049 / 0.047 | ✅ |
| escada | maior/menor degrau ΔL (≤ 1.5) | 1.10 | ✅ |
| escada | ΔL tile (card) × página (background) (≥ 0.08) | 0.102 | ✅ |
| escada | accent acima de popover (≠ card, ≠ popover) | ΔL 0.047 | ✅ |
| semânticos | faixa de L dos status (spread ≤ 0.15) | 0.089 | ✅ |
| charts | chart-1 vs card (≥ 3) | 3.64 | ✅ |
| charts | chart-2 vs card (≥ 3) | 4.95 | ✅ |
| charts | chart-3 vs card (≥ 3) | 7.33 | ✅ |
| charts | chart-4 vs card (≥ 3) | 8.46 | ✅ |
| charts | chart-5 vs card (≥ 3) | 11.15 | ✅ |
| charts | escada de L crescente chart-1 (escuro) → chart-5 (claro) | 0.595 → 0.666 → 0.738 → 0.803 → 0.879 | ✅ |
| charts | passos de L ≈ iguais (maior/menor ≤ 1.5) | 1.17 | ✅ |
| charts | ΔE00 mínimo normal (≥ 12; alvo 15) | 27.9 (1×4) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo deuteranopia (≥ 12; alvo 15) | 20.2 (2×3) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo protanopia (≥ 12; alvo 15) | 17.9 (3×5) · alvo ✓ | ✅ |
| charts | ΔE00 mínimo tritanopia (≥ 12; alvo 15) | 20.2 (3×4) · alvo ✓ | ✅ |

#### Entre presets

- `brand-accent`: 5 valor(es) distinto(s) em 5 presets ✅
- `brand-muted`: 5 valor(es) distinto(s) em 5 presets ✅
- `primary`: 5 valor(es) distinto(s) em 5 presets ✅
- `@theme inline`: ✅ mapeia destructive-foreground e semânticos

#### Metas informativas (não reprovam)

### ΔE00 mínimo entre status (success × warning × info × alert)

| Preset | normal | deuteranopia | protanopia | tritanopia |
|---|---|---|---|---|
| zinc-minimalist | 31.0 (warning×alert) | 7.5 (success×alert) | 11.4 (success×warning) | 7.7 (warning×alert) |
| indigo | 31.8 (warning×alert) | 8.2 (success×alert) | 10.8 (success×warning) | 8.5 (warning×alert) |
| slate-cyan | 31.7 (warning×alert) | 7.9 (success×alert) | 11.0 (success×warning) | 8.2 (warning×alert) |
| github-dimmed | 27.1 (warning×alert) | 7.2 (success×alert) | 8.3 (success×warning) | 7.2 (warning×alert) |
| contrast-safe-graphite | 27.2 (warning×alert) | 7.0 (success×alert) | 7.7 (success×warning) | 7.0 (warning×alert) |

### ΔE00 entre os `primary` de presets diferentes

| Par | normal | deuteranopia | protanopia | tritanopia |
|---|---|---|---|---|
| zinc-minimalist × indigo | 42.8 | 25.7 | 38.5 | 23.4 |
| zinc-minimalist × slate-cyan | 20.7 | 19.8 | 25.2 | 3.7 |
| zinc-minimalist × github-dimmed | 34.5 | 24.2 | 32.7 | 12.3 |
| zinc-minimalist × contrast-safe-graphite | 46.7 | 20.1 | 31.7 | 53.6 |
| indigo × slate-cyan | 30.4 | 7.4 | 12.1 | 21.9 |
| indigo × github-dimmed | 15.3 | 7.5 | 10.0 | 18.2 |
| indigo × contrast-safe-graphite | 17.5 | 11.6 | 7.6 | 29.1 |
| slate-cyan × github-dimmed | 18.3 | 11.1 | 9.7 | 9.8 |
| slate-cyan × contrast-safe-graphite | 44.6 | 12.1 | 6.9 | 60.1 |
| github-dimmed × contrast-safe-graphite | 30.1 | 5.4 | 3.9 | 48.4 |
| **mínimo** | **15.3** | **5.4** | **3.9** | **3.7** |

**✅ 0 falhas.**


---

## 5. CSS proposto (não aplicado)

### 5.1 `@theme inline`

Mudanças em relação ao atual: `+ --color-destructive-foreground`, `+ success/warning/info` (e `-foreground`). `--color-warm` e `--color-cool` passam a apontar para os aliases deprecated.

```css
@theme inline {
	--font-heading: var(--font-sans);
	--font-sans: "Geist Variable", sans-serif;
	--breakpoint-3xl: 1440px;
	--color-sidebar-ring: var(--sidebar-ring);
	--color-sidebar-border: var(--sidebar-border);
	--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
	--color-sidebar-accent: var(--sidebar-accent);
	--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
	--color-sidebar-primary: var(--sidebar-primary);
	--color-sidebar-foreground: var(--sidebar-foreground);
	--color-sidebar: var(--sidebar);
	--color-chart-5: var(--chart-5);
	--color-chart-4: var(--chart-4);
	--color-chart-3: var(--chart-3);
	--color-chart-2: var(--chart-2);
	--color-chart-1: var(--chart-1);
	--color-ring: var(--ring);
	--color-input: var(--input);
	--color-border: var(--border);
	--color-destructive: var(--destructive);
	--color-destructive-foreground: var(--destructive-foreground);
	--color-accent-foreground: var(--accent-foreground);
	--color-accent: var(--accent);
	--color-muted-foreground: var(--muted-foreground);
	--color-muted: var(--muted);
	--color-secondary-foreground: var(--secondary-foreground);
	--color-secondary: var(--secondary);
	--color-primary-foreground: var(--primary-foreground);
	--color-primary: var(--primary);
	--color-popover-foreground: var(--popover-foreground);
	--color-popover: var(--popover);
	--color-card-foreground: var(--card-foreground);
	--color-card: var(--card);
	--color-foreground: var(--foreground);
	--color-background: var(--background);

	/* ESCADA DE SUPERFÍCIES HIERÁRQUICA */
	--color-surface-low: var(--muted);
	--color-surface-container: var(--card);
	--color-surface-high: var(--popover);
	--color-surface-highest: var(--surface-highest);
	--color-border-subtle: var(--border-subtle);
	/* Status */
	--color-success: var(--success);
	--color-success-foreground: var(--success-foreground);
	--color-warning: var(--warning);
	--color-warning-foreground: var(--warning-foreground);
	--color-info: var(--info);
	--color-info-foreground: var(--info-foreground);
	/* DEPRECATED — aliases de --warning / --primary */
	--color-warm: var(--warm);
	--color-warm-foreground: var(--warm-foreground);
	--color-cool: var(--cool);
	--color-cool-foreground: var(--cool-foreground);
	--color-alert: var(--alert);
	--color-alert-foreground: var(--alert-foreground);
	--color-brand-accent: var(--brand-accent);
	--color-brand-muted: var(--brand-muted);
	--radius-sm: calc(var(--radius) * 0.6);
	--radius-md: calc(var(--radius) * 0.8);
	--radius-lg: var(--radius);
	--radius-xl: calc(var(--radius) * 1.4);
	--radius-2xl: calc(var(--radius) * 1.8);
	--radius-3xl: calc(var(--radius) * 2.2);
	--radius-4xl: calc(var(--radius) * 2.6);
}
```

### 5.2 `.dark` (zinc-minimalist)

Inclui `color-scheme`, `--radius` e os aliases deprecated.

```css
.dark {
	color-scheme: dark;
	--radius: 0.75rem;

	/* Superfícies (escada: background → muted → card → popover → surface-highest) */
	--background: #0b0e0e;
	--foreground: #f4f5f5;
	--muted: #151818;
	--card: #1f2222;
	--card-foreground: #f4f5f5;
	--popover: #2a2d2d;
	--popover-foreground: #f4f5f5;
	--surface-highest: #353939;

	/* Ação */
	--primary: #37c695;
	--primary-foreground: #001d10;
	--secondary: #353939;
	--secondary-foreground: #f4f5f5;

	/* Texto secundário e hover (accent = um degrau acima de popover) */
	--muted-foreground: #a0a4a4;
	--accent: #353939;
	--accent-foreground: #f4f5f5;

	/* Destrutivo (ação) */
	--destructive: #ff8981;
	--destructive-foreground: #290b0a;

	/* Bordas e foco */
	--border-subtle: #3d4141;
	--border: #6a6e6e;
	--input: #6a6e6e;
	--ring: #37c695;

	/* Gráficos */
	--chart-1: #008d3c;
	--chart-2: #c960aa;
	--chart-3: #acac00;
	--chart-4: #9fbaff;
	--chart-5: #ffc59e;

	/* Sidebar */
	--sidebar: #0b0e0e;
	--sidebar-foreground: #f4f5f5;
	--sidebar-primary: #37c695;
	--sidebar-primary-foreground: #001d10;
	--sidebar-accent: #1f2222;
	--sidebar-accent-foreground: #f4f5f5;
	--sidebar-border: #3d4141;
	--sidebar-ring: #37c695;

	/* Status (texto/ícone usa a cor base; -foreground só sobre o sólido) */
	--success: #7de797;
	--success-foreground: #021c09;
	--warning: #ffb846;
	--warning-foreground: #231200;
	--info: #33c2ff;
	--info-foreground: #001929;
	--alert: #ff8981;
	--alert-foreground: #290b0a;

	/* Marca */
	--brand-accent: #12967a;
	--brand-muted: #cdd7d2;

	/* Aliases DEPRECATED — remover em task separada. Resolvem no mesmo elemento
	 * (<html>), então acompanham o --warning / --primary do preset ativo. */
	--warm: var(--warning);
	--warm-foreground: var(--warning-foreground);
	--cool: var(--primary);
	--cool-foreground: var(--primary-foreground);
}
```

### 5.3 indigo

```css
.dark[data-theme="indigo"] {
	/* Superfícies (escada: background → muted → card → popover → surface-highest) */
	--background: #0a0b15;
	--foreground: #f2f3f9;
	--muted: #14151f;
	--card: #1e202a;
	--card-foreground: #f2f3f9;
	--popover: #292b35;
	--popover-foreground: #f2f3f9;
	--surface-highest: #343641;

	/* Ação */
	--primary: #aca2ff;
	--primary-foreground: #15122b;
	--secondary: #343641;
	--secondary-foreground: #f2f3f9;

	/* Texto secundário e hover (accent = um degrau acima de popover) */
	--muted-foreground: #9fa1ac;
	--accent: #343641;
	--accent-foreground: #f2f3f9;

	/* Destrutivo (ação) */
	--destructive: #ff847d;
	--destructive-foreground: #290b0a;

	/* Bordas e foco */
	--border-subtle: #3b3e49;
	--border: #6a6c79;
	--input: #6a6c79;
	--ring: #aca2ff;

	/* Gráficos */
	--chart-1: #6463cd;
	--chart-2: #d56817;
	--chart-3: #00c394;
	--chart-4: #dd9eff;
	--chart-5: #cae763;

	/* Sidebar */
	--sidebar: #0a0b15;
	--sidebar-foreground: #f2f3f9;
	--sidebar-primary: #aca2ff;
	--sidebar-primary-foreground: #15122b;
	--sidebar-accent: #1e202a;
	--sidebar-accent-foreground: #f2f3f9;
	--sidebar-border: #3b3e49;
	--sidebar-ring: #aca2ff;

	/* Status (texto/ícone usa a cor base; -foreground só sobre o sólido) */
	--success: #7ce695;
	--success-foreground: #021c09;
	--warning: #ffb948;
	--warning-foreground: #231200;
	--info: #2bbdff;
	--info-foreground: #001929;
	--alert: #ff847d;
	--alert-foreground: #290b0a;

	/* Marca */
	--brand-accent: #5e6ad2;
	--brand-muted: #d3d3dc;
}
```

### 5.4 slate-cyan

```css
.dark[data-theme="slate-cyan"] {
	/* Superfícies (escada: background → muted → card → popover → surface-highest) */
	--background: #070f19;
	--foreground: #f1f6fc;
	--muted: #101924;
	--card: #1a232f;
	--card-foreground: #f1f6fc;
	--popover: #252f3b;
	--popover-foreground: #f1f6fc;
	--surface-highest: #303a47;

	/* Ação */
	--primary: #3fbfcc;
	--primary-foreground: #001b1f;
	--secondary: #303a47;
	--secondary-foreground: #f1f6fc;

	/* Texto secundário e hover (accent = um degrau acima de popover) */
	--muted-foreground: #9ca6b2;
	--accent: #303a47;
	--accent-foreground: #f1f6fc;

	/* Destrutivo (ação) */
	--destructive: #ff8c84;
	--destructive-foreground: #290b0a;

	/* Bordas e foco */
	--border-subtle: #38424f;
	--border: #65707e;
	--input: #65707e;
	--ring: #3fbfcc;

	/* Gráficos */
	--chart-1: #00888f;
	--chart-2: #d66919;
	--chart-3: #9296ff;
	--chart-4: #c5c632;
	--chart-5: #41f9c7;

	/* Sidebar */
	--sidebar: #070f19;
	--sidebar-foreground: #f1f6fc;
	--sidebar-primary: #3fbfcc;
	--sidebar-primary-foreground: #001b1f;
	--sidebar-accent: #1a232f;
	--sidebar-accent-foreground: #f1f6fc;
	--sidebar-border: #38424f;
	--sidebar-ring: #3fbfcc;

	/* Status (texto/ícone usa a cor base; -foreground só sobre o sólido) */
	--success: #81eb9a;
	--success-foreground: #021c09;
	--warning: #ffbd4b;
	--warning-foreground: #231200;
	--info: #36c4ff;
	--info-foreground: #001929;
	--alert: #ff8c84;
	--alert-foreground: #290b0a;

	/* Marca */
	--brand-accent: #06b6d4;
	--brand-muted: #ccd7d8;
}
```

### 5.5 github-dimmed

```css
.dark[data-theme="github-dimmed"] {
	/* Superfícies (escada: background → muted → card → popover → surface-highest) */
	--background: #1c2128;
	--foreground: #e5e8ec;
	--muted: #252b32;
	--card: #2f353d;
	--card-foreground: #e5e8ec;
	--popover: #393f47;
	--popover-foreground: #e5e8ec;
	--surface-highest: #444a52;

	/* Ação */
	--primary: #9dceff;
	--primary-foreground: #05162c;
	--secondary: #444a52;
	--secondary-foreground: #e5e8ec;

	/* Texto secundário e hover (accent = um degrau acima de popover) */
	--muted-foreground: #b5bbc3;
	--accent: #444a52;
	--accent-foreground: #e5e8ec;

	/* Destrutivo (ação) */
	--destructive: #ffb6ab;
	--destructive-foreground: #290b09;

	/* Bordas e foco */
	--border-subtle: #4c525a;
	--border: #7a818a;
	--input: #7a818a;
	--ring: #9dceff;

	/* Gráficos */
	--chart-1: #2389e2;
	--chart-2: #e6772e;
	--chart-3: #00cd9e;
	--chart-4: #b4baff;
	--chart-5: #ffd243;

	/* Sidebar */
	--sidebar: #1c2128;
	--sidebar-foreground: #e5e8ec;
	--sidebar-primary: #9dceff;
	--sidebar-primary-foreground: #05162c;
	--sidebar-accent: #2f353d;
	--sidebar-accent-foreground: #e5e8ec;
	--sidebar-border: #4c525a;
	--sidebar-ring: #9dceff;

	/* Status (texto/ícone usa a cor base; -foreground só sobre o sólido) */
	--success: #82db82;
	--success-foreground: #061c06;
	--warning: #fdbc44;
	--warning-foreground: #221200;
	--info: #6cd4ff;
	--info-foreground: #001929;
	--alert: #ffb6ab;
	--alert-foreground: #290b09;

	/* Marca */
	--brand-accent: #316dca;
	--brand-muted: #cfd5dc;
}
```

### 5.6 contrast-safe-graphite

O comentário foi reescrito só com números medidos pelo checker.

```css
/*
 * contrast-safe-graphite — identidade = acessibilidade. Superfícies neutras
 * (C = 0) e cor só em acento/status. Alvos mais altos que os demais presets
 * (texto ≥ 5.5:1, UI ≥ 3.6:1). Números medidos por scripts/theme-contrast-check.mjs:
 * muted-foreground vs surface-highest 5.61:1 (pior superfície) e vs card 7.85:1;
 * primary como texto sobre primary/15 em popover 5.61:1;
 * primary-foreground vs primary 10.70:1; alert-foreground vs alert 10.34:1;
 * border vs card 3.65:1; ring vs background 11.51:1; ΔL tile (card) × página 0.100.
 * Qualquer mudança aqui: rodar `npm run check:theme` antes de commitar.
 */
.dark[data-theme="contrast-safe-graphite"] {
	/* Superfícies (escada: background → muted → card → popover → surface-highest) */
	--background: #0b0b0b;
	--foreground: #fafafa;
	--muted: #161616;
	--card: #222222;
	--card-foreground: #fafafa;
	--popover: #2e2e2e;
	--popover-foreground: #fafafa;
	--surface-highest: #3a3a3a;

	/* Ação */
	--primary: #f4b0ed;
	--primary-foreground: #210e1f;
	--secondary: #3a3a3a;
	--secondary-foreground: #fafafa;

	/* Texto secundário e hover (accent = um degrau acima de popover) */
	--muted-foreground: #b6b6b6;
	--accent: #3a3a3a;
	--accent-foreground: #fafafa;

	/* Destrutivo (ação) */
	--destructive: #ffaea6;
	--destructive-foreground: #290b0a;

	/* Bordas e foco */
	--border-subtle: #424242;
	--border: #797979;
	--input: #797979;
	--ring: #f4b0ed;

	/* Gráficos */
	--chart-1: #a75ab9;
	--chart-2: #df7126;
	--chart-3: #22c886;
	--chart-4: #b1b8ff;
	--chart-5: #f0d947;

	/* Sidebar */
	--sidebar: #0b0b0b;
	--sidebar-foreground: #fafafa;
	--sidebar-primary: #f4b0ed;
	--sidebar-primary-foreground: #210e1f;
	--sidebar-accent: #222222;
	--sidebar-accent-foreground: #fafafa;
	--sidebar-border: #424242;
	--sidebar-ring: #f4b0ed;

	/* Status (texto/ícone usa a cor base; -foreground só sobre o sólido) */
	--success: #95ffad;
	--success-foreground: #021c09;
	--warning: #ffd17b;
	--warning-foreground: #231200;
	--info: #7bd8ff;
	--info-foreground: #001929;
	--alert: #ffaea6;
	--alert-foreground: #290b0a;

	/* Marca */
	--brand-accent: #b464ae;
	--brand-muted: #d9d1d8;
}
```

---

## 6. Papéis de superfície na página

| Papel | Token / classe | Hoje na Início | Proposto |
|---|---|---|---|
| Página | `bg-background` | `<main>` com `bg-linear-to-b from-muted to-background` (`AppLayout.tsx:49`); o topo do gradiente tem a cor do tile | `bg-background` **sólido**. Se quiser manter gradiente, ele não pode passar por `muted` nem por `card` (ΔL `card − muted` = 1 degrau < mínimo). |
| Tile | `bg-card` (surface-container) + `border-border-subtle` | `bg-surface-low` (= `muted`) | `bg-card` |
| Elemento interno do tile (cápsula, card de dispositivo, trilho do feed) | `bg-popover` (surface-high) | `bg-surface-container/60`, `/40`, `/50` | `bg-popover`, sólido e sem opacidade |
| Menu / Dialog / Sheet | `bg-popover` | `bg-surface-container` no dropdown do HomeHeader | `bg-popover` (padrão shadcn, sem override) |
| Hover ou selecionado dentro de popover | `bg-accent` / `bg-surface-highest` (mesmo valor) | `focus:bg-accent` (= `card`, invisível, R9) | `accent` = `surface-highest`, um degrau acima |
| Poço / recuo (trilho de switch desligado, barra de progresso, skeleton, input) | `bg-muted` (surface-low) | Misturado com tile | `bg-muted` |

**Separação tile × página:** o mínimo é **ΔL OKLCH ≥ 0.08** entre `card` e `background`, medido de 0.081 a 0.102 (razão WCAG de 1.21:1 a 1.31:1).

- **Por que ΔL e não razão WCAG:** em superfícies escuras, a razão WCAG é pouco sensível (o audit mediu tiles com ΔL 0.04 dando 1.06:1, "invisíveis"). L de OKLCH é perceptualmente uniforme, então a mesma diferença de L parece igual em qualquer preset.
- **Por que 0.08:** equivale a 2 degraus da escada, com cada degrau ≥ 0.04. Um degrau único, que é o tamanho dos saltos do audit que falharam (`muted → card` 0.027–0.046), mostrou-se insuficiente sem borda. Com 2 degraus, o tile se sustenta **sem** depender da borda, e `border-subtle` vira só reforço.

### 6.1 Receitas de estado (sem token novo)

```tsx
// Botão primário — hover/active por opacidade; disabled por opacidade; foco = ring
"bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
// Modo/filtro selecionado (SecurityTile, filtros do DeviceGrid) — sempre com aria-pressed
"aria-pressed:bg-primary/15 aria-pressed:border-primary/40 aria-pressed:text-primary"
// Badge de status — texto/ícone na cor base, fundo por opacidade
"bg-success/15 text-success border border-success/30"   // idem warning, info, alert
// Alerta — ícone e texto usam `alert`; `alert-foreground` só sobre `bg-alert` sólido
"text-alert"            // nunca "text-alert-foreground" sobre fundo escuro
// Item de menu em foco (padrão shadcn, agora visível)
"focus:bg-accent focus:text-accent-foreground"
// Clarear/escurecer além da escada (regra já existente)
"hover:brightness-110"  // ou bg-[color-mix(in_oklch,var(--popover),var(--foreground)_6%)]
```

Todos os pares acima estão no checker: `primary/15`, `primary/90`, `primary/80` e `*/15` de cada status.

### 6.2 Regra 60 / 30 / 10

- **60% neutros:** `background`, `card`, `popover`, texto `foreground` / `muted-foreground`. Cabeçalhos de tile e ícones de cabeçalho ficam em `muted-foreground`, e não em `primary`.
- **30% estrutura:** `border-subtle`, `border`, `muted` (poços), `surface-highest` (hover).
- **10% acento:** `primary` **apenas** em ação primária, item ativo/selecionado/ligado e foco; status (`success` / `warning` / `info` / `alert`) apenas em estado real; `chart-*` apenas em dado ou categoria.
- **Fora dessa regra hoje na Início:** os glows `shadow-primary/5`, `bg-primary/8 blur-3xl`, os ícones decorativos de cabeçalho em `bg-primary/10` e "Luzes" pintado de `primary`. Esses pontos migram para neutro ou para `chart-*`.

---

## 7. Mapeamento categórico → `chart-*`

As categorias viram **famílias de domínio**, e cada família recebe uma série. A matiz de cada `chart-n` muda por preset (tabelas da §3), mas o mapeamento e a **ordem de luminosidade** são os mesmos em todos: `chart-1` é sempre a série mais escura e `chart-5` a mais clara. Assim, a leitura "escuro → claro" funciona até em tela monocromática ou impressão em cinza.

| Série | Família | DEVICE_CONFIG (`core/constants/device-config.ts`) | Cenas (`HomeQuickActions`) | Energia (`HomeEnergyTile`) | Atividade (`HomeActivityFeed`) |
|---|---|---|---|---|---|
| `chart-1` | Iluminação e energia | Light, Switch | Bom Dia | Luzes | — |
| `chart-2` | Clima e conforto | Thermostat | Boa Noite | Clima | — |
| `chart-3` | Monitoramento e automação | Sensor, Camera | — | — | Automação |
| `chart-4` | Mídia | Television | Modo Cinema | — | — |
| `chart-5` | Segurança | Lock, Alarm | Sair de Casa | — | — |
| `muted-foreground` | Sem categoria | — | — | Outros | Evento genérico |
| `alert` (status, não categoria) | — | — | — | — | Alerta |

- Tipos que compartilham série (Light/Switch, Sensor/Camera, Lock/Alarm) são diferenciados pelo **ícone**, que já é distinto no `DEVICE_CONFIG`. Cor igual para a mesma família é intencional.
- Categoria nunca usa `success` / `warning` / `info` / `alert`: status ≠ categoria.

---

## 8. Achados do audit × resolução

| Achado | Resolução | Onde |
|---|---|---|
| R1 zinc sem cor de papel | `primary` teal L 0.74 / C 0.14, deixa de ser igual a `foreground`; `chart-*` cromáticos com escada de L | §1, §3.1 |
| R2 sem identidade de superfície | Neutros tingidos pela matiz do acento (C 0.005–0.026); graphite C 0 justificado | §1 |
| R3 tile se funde à página | Tile = `card`, página = `background` sólido, ΔL ≥ 0.08 | §6 |
| R4 cor viva hardcoded | `success` / `warning` / `info` (exceção §0) + mapeamento categórico §7 | §0, §7 |
| R5 `text-primary` sobre tints | Primary em tom claro; checado sobre `/15` em card e popover | §4 |
| R6 graphite não contrast-safe | Alvos 5.5 / 3.6, 0 falhas, comentário com números reais | §3.5, §5.6 |
| R7 github `primary-foreground` 3.75; charts protan 0.2 | `primary-foreground` escuro ≥ 4.5; charts ≥ 12 nas 4 visões (github: 16.9) | §1.1, §4 |
| R8 alerta branco | `alert-foreground` escuro ≥ 4.5 sobre `alert`; ícone/texto = `text-alert` | §6.1 |
| R9 foco do dropdown invisível | `accent` = `surface-highest`, acima de `popover` | §6 |
| Y1 docs invertidas | Rascunho §10 | §10 |
| Y2 colapsos de valor | Colapsos restantes são **aliases intencionais de degrau** e ficam documentados: `accent` = `secondary` = `surface-highest`, `input` = `border`, `ring` = `primary`, `destructive` = `alert`, `sidebar` = `background`, `sidebar-accent` = `card` | §3 |
| Y3 `brand-*` idênticos | Redefinidos por preset (checker: 5 valores distintos) | §4 |
| Y4 `warm` instável | `warm` → alias deprecated de `warning`, mesma família em todos | §2 (item 6) |
| Y5 `chart-*` sem uso / zinc cinza | Charts cromáticos + mapeamento §7 | §7 |
| Y6 seleção só por cor | Receita com `aria-pressed` | §6.1 (migração de componente) |
| Y7 foco inconsistente | `ring` = primary ≥ 3:1 vs background **e** card; receita única | §6.1 (migração) |
| Y8 `muted-foreground` vs `surface-highest` | ≥ 4.6 (graphite 5.61) | §4 |
| Y9 `border` < 3:1 | `border` ≥ 3.1 (graphite 3.65) vs card | §4 |
| Y10 `border-subtle` > `border` no graphite | L(`border-subtle`) < L(`border`) nos 5 | §4 |
| Y11 `destructive-foreground` | Definido nos 5 e mapeado no `@theme inline` | §5.1 |
| Y12 nav mobile → `/dashboard` | Fora do escopo de cor, continua aberto | — |
| Y13 sucesso com 2 cores | `success` único | §0 |
| Y14 `primary` categórico | Luzes → `chart-1`, automação → `chart-3` | §7 |
| B1–B7 | Cosméticos, resolvidos na migração de componentes (B3: HUD sobre vídeo continua `black/60` porque o fundo é vídeo, não tema) | §9 |

---

## 9. Migração de componentes (não feita, para task separada)

Aplicar a paleta **sem** estas mudanças quebra a Início em dois pontos: o `alert-foreground` agora é escuro, e os tiles continuariam em `muted`.

1. **`text-alert-foreground` sobre fundo escuro → `text-alert`:** `HomeAlertBanner.tsx:34,39,43,46,55`, `HomeActivityFeed.tsx:26`. No projeto inteiro são 10 ocorrências (`grep -rn "text-alert-foreground" src`).
2. **Tiles `bg-surface-low` → `bg-card`:** os 8 tiles da Início. Os elementos internos `bg-surface-container/NN` passam para `bg-popover`.
3. **`AppLayout.tsx:49`:** `from-muted to-background` → `bg-background`.
4. **`emerald-*` → `success`, `amber-*` → `warning`, `sky-*` → `info`** (tabela 5.1 do audit). Categóricos → `chart-*` (§7).
5. **`HomeHeader.tsx:78`:** remover `bg-surface-container` do `DropdownMenuContent` (volta a ser `popover`).
6. **`aria-pressed` + receita de selecionado:** SecurityTile e filtros do DeviceGrid. **`focus-visible:ring`** nos ~7 grupos listados no audit §6.
7. **`AuthLayout.tsx:169`:** o `drop-shadow` com `rgba(18,150,122,0.35)` fixo deixa de acompanhar o `brand-accent` por preset. Trocar por `drop-shadow-brand-accent/20` ou similar.
8. **Depois de migrar:** incluir `check:theme` no `npm run lint`.
9. **Remover aliases `--warm` / `--cool`** (task própria): 233 ocorrências de classes `warm`/`cool` em `src/` (`.ts`/`.tsx`) a revisar.
10. **`ThemePresetSelector`** (`features/settings/components/ThemePresetSelector.tsx`), verificado. As duas variantes **mostram o nome** do preset (grade: `option.label` + ✓ + anel no selecionado; dropdown: `option.label` + indicador de radio), então não precisa de `theme-followups.md`. Pendências menores para a migração:
    - `theme.types.ts` `swatch` tem os hex **atuais** fixos (`primary: "#fafafa"` no zinc etc.). Atualizar para os hex da §3 junto com o `index.css`, senão a prévia mostra a paleta velha.
    - O gatilho compacto (`variant="dropdown"`) indica o preset ativo só por um ponto de cor (`size-1.5`). O `aria-label` é genérico ("tema") e o tooltip diz "Alterar o tema". Sugestão: tooltip/`aria-label` com o nome do preset ativo ("Tema: Indigo").
    - O ✓ do selecionado na grade usa `color: swatch.primary` sobre `bg-black/20`. Trocar por `text-foreground` ou garantir ≥ 3:1: com a paleta nova, a forma do ✓ carrega a informação, mas a cor sozinha varia por preset.

---

## 10. Rascunho de correções de documentação (não aplicado)

### 10.1 `frontend/CLAUDE.md` — "Contraste de superfície (elevação)"

Substituir o parágrafo atual por:

> **Contraste de superfície (elevação)**: escada `background` (página) → `muted` (surface-low, poço/recuo) → `card` (surface-container, **tile**) → `popover` (surface-high, elemento interno do tile, menu, dialog) → `surface-highest` (= `accent`, hover/selecionado dentro de popover). O filho sobe sempre pelo menos um degrau em relação ao pai. Um Dialog nasce em `bg-popover`, então cards internos dele usam `bg-surface-highest`, nunca `bg-card` (mais escuro que o próprio Dialog) nem `bg-popover` (mesmo nível). Tile × página: ΔL OKLCH ≥ 0.08 (garantido pela escada e checado por `npm run check:theme`); `border-subtle` é reforço, nunca o único separador.

### 10.2 `frontend/CLAUDE.md` — Paleta oficial e regra de presets

- Substituir a lista "Paleta Oficial (Zinc…)" pela referência "valores em `index.css`, verificados por `npm run check:theme`". Hex copiados em doc ficam desatualizados.
- Na regra de preset:
  - Trocar "(`background` até `sidebar-ring`, `warm`, `alert`)" por "(todos os tokens de `REQUIRED` em `scripts/theme-contrast-check.mjs`, incluindo `success` / `warning` / `info`, `destructive-foreground` e `brand-*`)".
  - Adicionar: "Nenhum preset é mesclado sem `npm run check:theme` com 0 falhas."
- **Graphite:** trocar "`muted-foreground` vs `card` 8.82:1" pelo valor medido do novo comentário do `index.css`, e remover a frase "não adicione tingimento de cor às superfícies sem recalcular", que o checker passa a garantir.
- **KPIs:** trocar "`text-primary`, `text-warm`, `text-cool`, `text-alert-foreground`" por "`text-primary`, `text-success`, `text-warning`, `text-info`, `text-alert` (nunca `text-alert-foreground` fora de `bg-alert` sólido)".
- **Tabela de presets:** atualizar a coluna "Cor primária" com os hex da §1 e acrescentar a coluna "Neutros (H/C)".
- **Regra "Proibido criar token novo":** acrescentar "— exceção aprovada em 2026-09-23: `success`, `warning`, `info` (+ `-foreground`), ver `docs/theme-proposal.md` §0. Qualquer outro token novo continua exigindo aprovação explícita."

### 10.3 Regras novas (`frontend/CLAUDE.md`, seção UI/UX)

- **Status × categoria:** `success` / `warning` / `info` / `alert` só comunicam estado real, e **sempre com ícone ou texto junto** (sob deuteranopia/protanopia, a distância entre status fica em ΔE00 7–8, abaixo do limiar de distinção só por cor). Categorias (tipo de dispositivo, cena, série de energia) usam `chart-1..5` conforme a tabela de famílias. Status nunca é categoria.
- **`accent` é hover, não marca:** `bg-accent` só em hover/foco de ghost/menu. Cor de marca = `brand-accent`.
- **60/30/10:** `primary` só em ação primária, item ativo e foco. Ícones de cabeçalho de card e glows ficam neutros.
- **Daltonismo:** séries de dados usam `chart-1..5` na ordem de luminosidade (escuro → claro), e nunca dependem só de matiz. Legendas sempre com rótulo; linhas com marcador ou traço distinto quando houver ≥ 3 séries.
- **Estados:** hover/active por opacidade (`/90`, `/80`) ou `color-mix(in oklch, …)`, disabled por opacidade, seleção com `aria-pressed` e foco `focus-visible:ring-2 ring-ring` em todo controle.

### 10.4 `frontend/docs/ui-and-design-system.md`

- **Linha 117:** mesma escada da §10.1.
- **Linha 119:** "cards dentro de Dialog: `bg-surface-highest`".
- **Linhas 168–169**, colunas "Depois / Motivo":
  - Linha 168 (painel de detalhe): "`bg-card` no painel, `bg-popover` nos blocos".
  - Linha 169 (wizard em Dialog): "`bg-surface-container` (= `card`) dentro de Dialog `bg-popover` → `bg-surface-highest`, porque o filho estava **mais escuro** que o modal".
- **Seção de validação automática** (perto da linha 156): acrescentar o `check:theme` ao lado do `lint:tokens`.

### 10.5 `.claude/rules/frontend-fsd.md`

- Adicionar uma linha: "Cores: somente tokens semânticos (ver `frontend/CLAUDE.md` › UI/UX). Mudança em `index.css` exige `npm run check:theme` com 0 falhas."

---

## 11. Trade-offs conhecidos

- **Charts × status compartilham família de matiz:**
  - Algumas séries caem perto de `success` (150–170°) ou `warning` (50°, laranja), mas em L diferente do status, já que a escada de L é fixa por posição.
  - A mitigação é a regra de §10.3: status sempre com ícone ou texto; categoria nunca no mesmo componente que badge de status.
- **`chart-5` claro (L 0.88):** em alguns presets tem croma baixo (ex.: zinc `chart-5` pêssego C 0.08). É o custo da escada de L; em compensação, é a série mais distinguível sem cor.
- **Primaries entre presets:** o pior par sob CVD é 3.9 (§1.1). O nome do preset no seletor é o canal de identificação que não depende de cor.
- **`info` ≈ `primary`** em slate-cyan (235° × 215°) e github-dimmed (235° × 255°), já que as duas famílias são azuis. Diferenciados pelo papel: `info` só em badge/ícone de status.
- **Semânticos mais claros** que os `-400` do Tailwind (L 0.75–0.92). É o custo de passar em 4.5:1 sobre o tint `/15` composto sobre `popover` e de separar os status por L, e segue o padrão Material 3 (tom 80+ em dark). `alert` fica no menor L permitido para continuar vermelho, e não rosa.
- **`border` ≥ 3:1 fica visivelmente mais forte.** Por isso o tile usa `border-subtle`, e `border` fica restrito a componentes interativos (input, outline).
- **github-dimmed fica mais claro que o Primer em texto:** `foreground` vira L 0.93 contra 0.783 no Primer, porque o `fg.muted` do Primer (3.29:1 sobre overlay) não passa no nosso mínimo.
- **`:root` (light) fora do escopo:** os novos `--color-success/warning/info` apontam para variáveis que o `:root` não define. Hoje é inofensivo porque `<html class="dark">` é fixo (`index.html:2`), mas precisa ser tratado se o modo claro for ativado.
