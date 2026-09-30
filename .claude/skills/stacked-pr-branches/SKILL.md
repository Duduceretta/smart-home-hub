---
name: stacked-pr-branches
description: Usar ao criar branch ou abrir PR no GitHub que depende de outro PR ainda não mergeado na main (ex. frontend em cima do backend da mesma feature), e ao atualizar a branch filha depois que a pai for mergeada.
---

# Branches e PRs Dependentes (Stacked) — GitHub

## Nomenclatura
`<type>/NH-XXX-descricao-curta` (ex: `feat/NH-42-home-summary-backend`).

## Criar a filha
Quando `feat/NH-43-home-frontend` depende de `feat/NH-42-home-backend`:

1. Criar a filha a partir da pai:
   ```bash
   git checkout -b feat/NH-43-home-frontend feat/NH-42-home-backend
   ```
2. Abrir o PR da filha com **base branch = `feat/NH-42-home-backend`** (NÃO a `main`).
3. Abrir como **Draft PR** e título com `[BLOCKED BY NH-42]`.
4. Na descrição: `Depends on #<número do PR pai>`.

## Depois que a pai for mergeada
- Com "Automatically delete head branches" ligado no repo, o GitHub apaga a branch pai e **retarget automático** do PR filho para `main`. Conferir que aconteceu.
- Se o merge da pai foi **squash** ou **rebase**, os commits da pai na filha viram duplicados. Rebase só dos commits próprios:
  ```bash
  git fetch origin
  git rebase --onto origin/main <último-commit-da-pai> feat/NH-43-home-frontend
  git push --force-with-lease
  ```
- Remover `[BLOCKED BY NH-42]` do título e tirar do Draft.

## Regras
- Nunca `git push --force` puro; sempre `--force-with-lease`.
- Mudança pedida em review da pai: fazer na pai e rebasear a filha em cima, não corrigir na filha.
- Máximo recomendado de 2–3 níveis de stack; mais que isso, quebrar o escopo.
