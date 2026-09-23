# 🏠 Smart Home Hub IoT — Diretrizes & Padrões do Projeto

Monorepo de Casa Inteligente de alta performance composto por Backend em C# (.NET 10) e Frontend em React 19 + TypeScript + Tailwind CSS.

---

## ⚡ Infraestrutura Local
- **Máquina**: 16 GB RAM — sem restrição de comando pesado (diferente de setups com 8GB); pode rodar múltiplos containers/builds em paralelo sem preocupação especial.
- **Subir Containers**: `docker-compose up -d` (PostgreSQL + TimescaleDB + Mosquitto)

> Comandos de backend/frontend e regras específicas de cada camada estão em `backend/CLAUDE.md` e `frontend/CLAUDE.md`.

---

## 🏛️ Diretrizes Globais do Ecossistema

1. **Padrão de Tempo (UTC Absoluto)**: API e banco trafegam e salvam datas estritamente em **UTC** (`DateTimeOffset`). Backend nunca lida com fuso horário; conversão pra horário local (`Intl.DateTimeFormat`) ocorre só na camada visual do frontend.
2. **Soft Delete Mandatório**: dados nunca são hard-deleted — frontend não deve assumir que `DELETE` físico funciona. Detalhes de implementação (`ISoftDeletable`, `AppDbContext`, `DeleteBehavior`) estão em `backend/CLAUDE.md`.

---

## 📋 Gestão de Tarefas (Jira — projeto NH / NexusTeam)

- **Epic**: fase grande do TCC (ex: `[EPIC] Pilar 8 — DevOps/Docker`).
- **Story**: entrega vertical com valor perceptível, testável isoladamente. Regra solo: 1 Story = 1 branch/commit-set coeso (sem obrigação de MR, já que não há review externo).
- **Sub-tasks**: checklist técnico dentro da Story (ex: NH-12 endpoint, NH-13 componente React, NH-14 teste de integração).
- Toda task nova nasce como Sub-task de uma Story existente; sem Story clara pro trabalho, criar a Story primeiro.

---

## 🧪 Workflow: Teste Antes do Código

1. **Reconhecimento**: mapear dependências e código afetado antes de alterar (usar subagente de investigação se disponível).
2. **Lógica nova**: TDD — teste que falha → implementa mínimo → refatora.
3. **Mudança em código existente/arriscada**: teste de integração com Testcontainers antes de tocar (usar skill `testcontainers` quando envolver setup de container).
4. Rodar suite local antes de qualquer commit.

---

## 🌿 Git & Commits

- **Branch**: `feat/NH-XXX-descricao-curta` (ou `fix/`, `refactor/`, conforme o tipo).
- **Commits em Inglês**: título e corpo sempre em inglês, Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `test`, `docs`), prefixado com a chave `NH-XXX`.
- **Commits Separados por Lógica e Contexto**: nunca agrupar num único commit mudanças de preocupações diferentes (CRUD de escrita vs. leitura vs. teste vs. correção não relacionada encontrada de passagem). Cada commit conta uma história coesa e revisável isoladamente — em dúvida, prefira mais commits pequenos a um grande.

Regras específicas de Backend (CQRS/C#) e Frontend (FSD/design system) estão em `backend/CLAUDE.md` e `frontend/CLAUDE.md`.