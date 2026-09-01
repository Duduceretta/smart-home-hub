# 🏠 Smart Home Hub IoT — Diretrizes & Padrões do Projeto

Monorepo de Casa Inteligente de alta performance composto por Backend em C# (.NET 10) e Frontend em React 19 + TypeScript + Tailwind CSS.

---

## ⚡ Infraestrutura Local
- **Subir Containers**: `docker-compose up -d` (PostgreSQL + TimescaleDB + Mosquitto)

> Comandos de backend/frontend e regras específicas de cada camada estão em `backend/CLAUDE.md` e `frontend/CLAUDE.md`.

---

## 🏛️ Diretrizes Globais do Ecossistema

1. **Padrão de Tempo (UTC Absoluto)**: A API e o banco trafegam e salvam datas estritamente em **UTC** (`DateTimeOffset`). O backend nunca lida com fusos horários; a conversão para horário local (`Intl.DateTimeFormat`) ocorre exclusivamente na camada visual do frontend.
2. **Soft Delete Mandatório**: Entidades principais (`User`, `Room`, `Device`, `DeviceGroup`) implementam `ISoftDeletable` (`IsDeleted`, `DeletedAt`).
   - A aplicação **nunca dispara `DELETE` físico** — o `AppDbContext` intercepta e converte em atualização lógica.
   - **Atenção, agente**: o schema físico do EF Core **usa `DeleteBehavior.Cascade`/`.SetNull`/`.Restrict` extensivamente** nas relações — isso **não é proibido** e não deve ser removido ou "corrigido". Essas configurações funcionam como segunda camada de proteção para qualquer caminho que acesse o banco fora do `AppDbContext` interceptado (migrations, scripts administrativos). O que É esperado, e deve continuar sendo feito manualmente no Handler antes do soft-delete disparar, é a **desvinculação de FKs opcionais em memória** quando o pai é removido logicamente (ex: `DeleteRoomCommandHandler` zera `device.RoomId` num loop antes de remover o `Room`) — já que o soft-delete nunca aciona a constraint física do banco.
   - Índices parciais de unicidade (ex: `ExternalId`) devem conter `.HasFilter("\"IsDeleted\" = false")`.
3. **Commits em Inglês**: Mensagens de commit (título e corpo) são sempre em **inglês**, padrão Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `test`, `docs`), independente do idioma usado na conversa com o usuário.
4. **Commits Separados por Lógica e Contexto**: Nunca agrupar num único commit mudanças que pertencem a preocupações diferentes (ex: CRUD de escrita vs. endpoints de leitura vs. testes de integração vs. uma correção não relacionada encontrada de passagem). Cada commit deve contar uma história coesa e revisável isoladamente — quando em dúvida, prefira mais commits menores a um grande.

Regras específicas de Backend (CQRS/C#) e Frontend (FSD/design system) estão em `backend/CLAUDE.md` e `frontend/CLAUDE.md`.