# Follow-ups do tema (fora da tela Início)

> Levantados na aplicação da paleta de [`theme-proposal.md`](./theme-proposal.md) (branch `feat/theme-inicio`, 2026-09-23). Nenhum item é bloqueante: a regressão global (texto ilegível ou elemento sumido) já foi corrigida no commit `fix(frontend): stop using alert/destructive foreground as text colour`, e os screenshots antes/depois das 8 rotas estão em [`theme-screens/regression/`](./theme-screens/regression/). Os itens abaixo são ajustes visuais ou de dívida técnica, e **não** foram corrigidos agora.

## 1. Migração visual das demais telas

A Início é a única tela migrada para os papéis de superfície da §6 da proposta (página `background` → tile `card` → interno `popover` → hover `surface-highest`, poços `muted`).

- **Tiles em `surface-low`**: 67 arquivos `.tsx` fora de `widgets/home` ainda usam `bg-surface-low` (tile = `muted`, 1 degrau acima da página em vez de 2) e/ou `bg-surface-container/NN` translúcido nos elementos internos. Migrar tela a tela, com a mesma receita da Início.
- **Cores Tailwind cruas**: 75 ocorrências de paletas cruas (`emerald-*`, `amber-*`, `sky-*`, `purple-*`…) fora da Início. As principais:
  | Arquivo | Ocorrências | Observação |
  |---|---|---|
  | `widgets/layout/components/ArchitecturalResidenceIllustration.tsx` | 31 | Ilustração da tela de auth (avaliar se é arte, exceção documentada) |
  | `core/constants/device-config.ts` | 16 | Paleta categórica por tipo de dispositivo → migrar para `chart-*` usando `DEVICE_CATEGORY` de `widgets/home/constants/home-categories.ts` (mover o mapeamento para `core/` quando a 2ª tela precisar) |
  | `features/devices/components/detail/DeviceTelemetrySheet.tsx` | 6 | |
  | `widgets/layout/AuthLayout.tsx` | 4 | ver item 2 |
  | `features/dashboard/components/DashboardTopBar.tsx`, `StatusHubSummary.tsx` | 3 + 2 | status → `success`/`warning`/`info` |
  | `features/auth/components/VerifyEmailContent.tsx` | 3 | |
  | demais (Sidebar, Header, TV controls, cards da Dashboard) | 1–2 cada | |
- **`lint:tokens`**: as 263 violações restantes estão todas em `widgets/layout/components/DesktopAuthBackground.tsx` (hex de SVG do fundo de auth). É exceção de arte, a marcar com `design-token-lint-ignore` ou excluir do scan, e não migrar para tokens. Com isso, dá para `lint:tokens` passar a bloquear de verdade.
- **Glow fixo**: `features/devices/components/list/DeviceCard.tsx` tem `shadow-[0_0_6px_rgba(255,180,171,0.5)]` no ponto de offline, que não acompanha o `--alert` do preset.
- **Borda de componente mais forte**: `--border` agora tem ≥ 3:1 contra `card` (WCAG 1.4.11). Qualquer elemento com `border` sem cor explícita herda `border-border` pelo `@layer base` e ficou mais visível. Revisar telas que usam `border` onde a intenção era `border-border-subtle`.

## 2. `AuthLayout.tsx:169` — drop-shadow com rgba fixo

`drop-shadow-[0_0_8px_rgba(18,150,122,0.35)]` no texto da marca está travado no teal do `#12967a`. O `--brand-accent` agora muda por preset, e o brilho não acompanha (fica teal sobre índigo, orquídea etc.). Trocar por uma sombra derivada do token (ex.: `drop-shadow-[0_0_8px_color-mix(in_oklch,var(--brand-accent)_35%,transparent)]`).

## 3. Remoção dos aliases `--warm` / `--cool`

São aliases deprecated: `--warm: var(--warning)`, `--cool: var(--primary)`, declarados no `.dark` e mapeados no `@theme inline`. Hoje há 233 ocorrências de classes `warm`/`cool` em `src/` (`.ts`/`.tsx`, fora de testes), concentradas em `features/devices` (7 arquivos), `widgets/layout` (3), `features/history` (3), `features/device-groups` (2), `features/rooms` (1) e `core/components` (1).

- **Migração:** trocar cada uso pelo papel real. `warm` como aviso vira `warning`; `warm` como decoração ou categoria vira neutro ou `chart-*`. `cool` vira `primary` (ação/ativo) ou neutro.
- **Remoção:** depois disso, remover os aliases do `.dark`, do `@theme inline` e da lista do checker.

## 4. `HomeDeviceCard` — TODO de navegação

Clicar no card de dispositivo da Início navega para `/dashboard` (TODO no código). Não existe rota de detalhe individual (`/devices/:id`). Quando existir, apontar o card para ela.

## 5. `:root` (tema light) sem os tokens novos (§11 da proposta)

`--success`, `--warning`, `--info` (+ `-foreground`) e `--destructive-foreground` existem só nos presets dark. O `@theme inline` já mapeia `--color-success` etc., e sem valor no `:root` essas classes ficam sem cor no modo claro. Hoje é inofensivo porque `<html class="dark">` é fixo (`index.html:2`), mas precisa ser tratado antes de ativar o modo claro (junto com `brand-*` e a revisão de todo o `:root` pelo `check:theme`).

## 6. `ThemePresetSelector` (features/settings)

As duas variantes já mostram o **nome** do preset. Ficam as pendências menores:

- `types/theme.types.ts`: o `swatch` tem os hex **antigos** fixos (`primary: "#fafafa"` no zinc etc.). A prévia de Configurações mostra a paleta velha. Atualizar com os hex atuais do `index.css`.
- **Gatilho compacto** (`variant="dropdown"`, usado em AuthLayout e LegalLayout): o preset ativo aparece só como um ponto de cor de 6px. O tooltip diz "Alterar o tema" e o `aria-label` é genérico. Sugestão: "Tema: Indigo".
- **✓ da grade**: usa `color: swatch.primary` sobre `bg-black/20`. A forma carrega a informação, mas a cor varia por preset. Usar `text-foreground` ou garantir ≥ 3:1.

## 7. Seletor de residência da Início

O `DropdownMenu` do `HomeHeader` só renderiza com mais de um projeto (`useHomeProjects`), o que o backend ainda não suporta. Por isso não é alcançável no app nem capturável em screenshot. Os screenshots de "dropdown aberto" usam o mesmo componente shadcn na Dashboard.

## 8. Ambiente de testes e lint (pré-existentes, não causados pelo tema)

- **E2E:** 20 de 59 specs já falhavam no `main` antes desta branch. São seletores desatualizados, ex.: `getByText("Visão Geral da Casa")` em `home.spec.ts`, `getByRole('button', { name: 'Sair' })` ambíguo (2 elementos) em `auth.spec.ts`, e `getByRole('link', { name: 'Dispositivos' })` (a sidebar usa `<button>`). Lista completa na saída do `npx playwright test` do baseline.
- **Biome no Windows:** `npm run lint` reporta 588 erros de formatação num checkout Windows (`core.autocrlf=true` → CRLF no working tree, enquanto o Biome espera LF). O conteúdo commitado é LF e passa. Sugestão: `.gitattributes` com `* text=auto eol=lf`.
- **Unit:** 704 testes passam, com 7 "errors" de `HTMLCanvasElement.getContext` (jsdom sem `canvas`), pré-existentes.
- **Automações com mock de `/api/devices`:** com o mock de dispositivos da suíte de devices registrado depois do de automações, a página de Automações cai no error boundary (o mesmo acontece no `main`). Indica que a página quebra com um payload de `/api/devices` diferente do esperado pelo picker. Vale investigar a robustez desse parse.

## 9. Design (a observar com uso)

- **zinc:** o `primary` teal (H 165°) e o `success` verde (H 150°) são próximos. O `chart-1` do zinc (iluminação) também é verde. Com a regra "status sempre com ícone/texto" isso não é ambíguo, mas vale revisar se incomodar no uso.
- **Primaries entre presets sob CVD:** o pior par ficou em ΔE00 3.9 (github-dimmed × graphite, protanopia). O teto é estrutural (§1.1 da proposta). O nome do preset no seletor é o canal que não depende de cor.
