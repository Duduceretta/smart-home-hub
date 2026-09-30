# Diretrizes de Engenharia e Workflow

This file provides guidance to Claude Code (claude.ai/code) when working in this monorepo (`backend/` + `frontend/`). Convenções de stack e arquitetura: ver `CLAUDE.md` de cada pasta.

## MCPs e Acessos Externos Disponíveis

- **GitHub**: MCP GitHub oficial, repo `smart-home-hub`.
- **Jira**: MCP Atlassian (`jira-nexushub`), project key `NH` (ex.: `NH-42`). Issue com assignee/reporter Eduardo é o próprio usuário — tratar como "você", não terceiro.
- **Postgres**: MCP Postgres no banco de dev local (TimescaleDB, `smarthomedb`). Usar para inspecionar schema e rodar queries; nunca imprimir/logar credenciais.
- **context7**: consultar documentação antes de usar API de biblioteca que possa ter mudado recentemente (.NET 10, C# 14, React 19, Tailwind 4 etc.) — não confiar em memória de treino para essas versões.
- **chrome-devtools**: validação rápida de UI (console, network, snapshot).
- **claude-in-chrome**: fluxos que exigem sessão real logada no navegador (ex.: Google OAuth via `auth.nexushub.page`).

## Ambiente
- Máquina com 16 GB de RAM e Docker: Testcontainers liberado. Ainda assim, não subir serviço que o teste/tarefa não usa.

## Comunicação
- Responder em português. Código, identificadores, commits, branches e títulos de PR em inglês.
- Respostas curtas e diretas. Uma pergunta por vez.
- Termo técnico/jargão: explicar inline na 1ª menção.
- Não criar arquivos `.md`/docs sem pedido explícito.
- Entregável avulso para o usuário (relatório, script, export): salvar em `~/Downloads`.

---

## Gestão de Tarefas (Hierarquia no Jira)
- **Epic**: entregas maiores (ex: `[EPIC] Página de Início`).
- **Story**: fatias verticais que entregam valor perceptível. Regra: **1 Story = 1 Pull Request** — exceção: quando a Story exige PRs dependentes (stacked), ver skill `stacked-pr-branches`.
- **Sub-tasks**: checklist técnico dentro da Story (ex: endpoint, query, componente).
- Texto em issues/comentários do Jira: **Markdown puro**, nunca wiki markup.

---

## Retrocompatibilidade e Substituição Gradual (Expand and Contract)

Backend e frontend fazem deploy separado, então uma mudança de contrato nunca pode depender dos dois subirem juntos.

1. **Não sobrescrever direto código em uso**:
   - Telas/componentes com substituição grande: nova implementação em arquivo/pasta paralela; não reescrever a antiga no mesmo PR.
   - Endpoints/contratos: criar o novo mantendo o antigo ativo; marcar o antigo com `[Obsolete("...")]`.
   - Migrations: expand (adicionar, nullable) → migrar código/dados → contract (remover) em PR separado.
2. **Virada de chave**: apontar rota/consumidor para o novo só após implementação e testes concluídos.
3. **Limpeza**: deleção de arquivos legados, hooks órfãos e métodos obsoletos em PR `chore(...)` exclusivo, após estabilização.

---

## Testes

Testes vivem no repo e são **commitados junto com a mudança que cobrem**. Metodologia (reconhecimento, caracterização, TDD, ordem full-stack): skill `legacy-code-workflow`. Estrutura e comandos dos projetos de teste: `CLAUDE.md` de `backend/` e `frontend/`.

Regras:
- **Bug (de review ou não): teste reproduzindo primeiro (RED), depois o fix.**
- **Teste nunca simplifica o mecanismo real que está validando.** Se o bug pode morar no wiring (DI, lifetimes, middleware, config), o teste passa pelo composition root real (`WebApplicationFactory<Program>`), não por serviços montados à mão.
- Mecanismo isolado (lógica pura, parser, algoritmo): teste leve, sem Docker/Testcontainers.
- Escopo maior (feature, fluxo entre camadas): unit + integração juntos.
- Mudança que altera carga/frequência de query: validar contra o TimescaleDB real antes de commitar.

### Validação de UI
Validação rápida no Chrome no fluxo afetado. Nada demorado, sem rodada de screenshots.

---

## Checklist Antes de Commitar / Abrir PR

1. **Build 1x no fim do lote** de edições (`dotnet build`, `tsc`), não a cada edit.
2. **Rebase**: `git fetch` + rebase da branch de trabalho sobre a `main` atual.
3. **Atualizar a issue `NH`**: abaixo da descrição original (sem apagá-la), registrar o que foi implementado de fato — decisões, medições, testes escritos.
4. Só então: commit e abertura do PR.

Nunca adicionar atribuição de IA (`Co-Authored-By`, "Generated with...") em commits, PRs ou comentários.

Fluxo de branches/PRs dependentes (stacked): skill `stacked-pr-branches`.

---

## Skills — Quando Usar

| Situação | Skill |
|---|---|
| Alterar código existente ou implementar feature/fix | `legacy-code-workflow` |
| PR que depende de outro ainda não mergeado | `stacked-pr-branches` |
| Criar/editar componente visual React/Tailwind | `design-system` |
| Criar/editar endpoint, route group ou endpoint filter | `dotnet-minimal-apis` |
| Validação de entrada (validators, options, pipeline do Mediator) | `validation-patterns` |
| Tratamento de erro, ProblemDetails, middleware de exceção | `exception-handling` |
| Hub SignalR, grupos, cliente realtime | `signalr-integration` |
| Query EF Core, migration, performance de acesso a dados | `efcore-patterns` |
| Teste de integração com dependência real (DB, broker) | `testcontainers` |

Carregar a skill **antes** de começar a tarefa correspondente, não depois.

---

## Conventional Commits (Strict English)

`<type>(<optional scope>): NH-XXX <description in lowercase>`

### Allowed Types
- **`feat`**: new feature or capability.
- **`fix`**: bug fix.
- **`refactor`**: neither fixes a bug nor adds a feature.
- **`perf`**: performance optimization.
- **`test`**: adding or correcting tests.
- **`chore`**: maintenance, build configs, dependencies, tooling.

### Examples
- `feat(home): NH-42 add home summary endpoint`
- `fix(tuya): NH-51 serialize concurrent commands per device`
- `test(automation): NH-55 add characterization test for cooldown guard`
- `chore(auth): NH-60 remove obsolete password reset client flow`
