# 🏠 Smart Home Hub IoT — Diretrizes & Padrões do Projeto

Monorepo de Casa Inteligente de alta performance composto por Backend em C# (.NET 10) e Frontend em React 19 + TypeScript + Tailwind CSS.

---

## ⚡ Comandos Rápidos

### Backend (.NET 10)
- **Compilar**: `dotnet build`
- **Executar API**: `dotnet run --project src/SmartHomeHub.Api`
- **Rodar Testes**: `dotnet test`
- **Formatação de Código**: `dotnet csharpier .`

### Frontend (React 19 / Vite)
- **Desenvolvimento**: `npm run dev`
- **Checagem de Tipos / Build**: `npm run build`
- **Linter & Validação**: `npm run lint` (Biome)
- **Formatação**: `npm run format` (Biome)
- **Testes Unitários**: `npm run test` (watch) / `npm run test:run` (single run) / `npm run test:coverage` — Vitest. Specs ficam em `__tests__/` junto do código testado (ex: `src/features/dashboard/utils/__tests__/formatEnergy.spec.ts`).
- **Testes E2E**: `npm run test:e2e` (Playwright, headless) / `npm run test:e2e:ui` (modo interativo) / `npm run test:e2e:report`. Specs ficam em `e2e/*.spec.ts` na raiz do frontend (ex: `e2e/dashboard.spec.ts`, `e2e/devices.spec.ts`), com fixtures/helpers em `e2e/support/`.

### Infraestrutura Local
- **Subir Containers**: `docker-compose up -d` (PostgreSQL + TimescaleDB + Mosquitto)

---

## 🏛️ Diretrizes Globais do Ecossistema

1. **Padrão de Tempo (UTC Absoluto)**: A API e o banco trafegam e salvam datas estritamente em **UTC** (`DateTimeOffset`). O backend nunca lida com fusos horários; a conversão para horário local (`Intl.DateTimeFormat`) ocorre exclusivamente na camada visual do frontend.
2. **Soft Delete Mandatório**: Entidades principais (`User`, `Room`, `Device`, `DeviceGroup`) implementam `ISoftDeletable` (`IsDeleted`, `DeletedAt`).
   - Restrições físicas de banco de dados (`ON DELETE CASCADE` ou `SET NULL`) são **proibidas**. Cascatas e desvinculações são tratadas manualmente em código dentro dos Handlers antes do disparo do Soft Delete.
   - Índices parciais de unicidade (ex: `ExternalId`) devem conter `.HasFilter("\"IsDeleted\" = false")`.
3. **Commits em Inglês**: Mensagens de commit (título e corpo) são sempre em **inglês**, padrão Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `test`, `docs`), independente do idioma usado na conversa com o usuário.
4. **Commits Separados por Lógica e Contexto**: Nunca agrupar num único commit mudanças que pertencem a preocupações diferentes (ex: CRUD de escrita vs. endpoints de leitura vs. testes de integração vs. uma correção não relacionada encontrada de passagem). Cada commit deve contar uma história coesa e revisável isoladamente — quando em dúvida, prefira mais commits menores a um grande.

---

## ⚙️ Backend — Arquitetura Limpa & CQRS (C# / .NET 10)

### 1. Estrutura de Camadas
- `SmartHomeHub.Domain`: Entidades puras, Enums, primitivos `Result` e `Error` (zero dependências externas).
- `SmartHomeHub.Application`: Casos de uso divididos por features em CQRS.
- `SmartHomeHub.Infrastructure`: EF Core (`AppDbContext`), configurações de entidades, migrações, MQTT e serviços de rede.
- `SmartHomeHub.Api`: Host ASP.NET Core, Minimal APIs, Serilog, Scalar OpenAPI e Workers.
- `SmartHomeHub.IntegrationTests`: Testes E2E com **Testcontainers** (Docker real) no padrão AAA.

### 2. Padrões de Código e CQRS
- **Biblioteca Mediator**: Utiliza o pacote `Mediator` com Source Generators em tempo de compilação (não usar o MediatR clássico baseado em Reflection).
- **Nomenclatura**:
  - Command: `[Verbo][Substantivo]Command` (ex: `CreateRoomCommand`)
  - Query: `[Verbo][Substantivo]Query` (ex: `GetRoomsQuery`)
  - Handler: `[NomeDoCommandOuQuery]Handler`
- **Tratamento de Erros Híbrido**:
  - Falhas de negócio esperadas: `Result` / `Result<T>` via Result Pattern.
  - Falhas inesperadas/infraestrutura: Exceptions capturadas pelo `GlobalExceptionHandler`.
  - Ambos retornam `ProblemDetails` (RFC 7807) padronizado para o frontend (`400`, `403`, `404`, `409`, `422`, `500`).
- **Validação de Entrada (Strict In, Tolerant Out)**:
  - FluentValidation no pipeline behavior intercepta requests antes dos Handlers.
  - DTOs e Requests **não** utilizam `required` para permitir que o FluentValidation controle o erro `422/400` padronizado.
  - Entidades: propriedades de navegação usam `= null!`; escalares imutáveis podem usar `required`.
- **Paginação Obrigatória**:
  - Proibido retorno de listas infinitas. Toda listagem implementa `IPagedQuery` (`Page`, `PageSize`) e retorna `PagedResult<T>` ordenado obrigatoriamente com `.OrderBy()` no EF Core.
- **Logs Estruturados (Serilog)**:
  - Estritamente **proibida** interpolação de strings (`$"{Var}"`) nos logs. Sempre usar Message Templates (`"Processando {DeviceName}", name`).
- **Telemetria IoT**: `DeviceTelemetryLog` segue padrão *Append-Only* no TimescaleDB (não usa Soft Delete).

---

## ⚛️ Frontend — Feature-Sliced Design (React 19 / TypeScript)

### 1. Estrutura FSD Estrita
```
src/
├── app/        # Providers globais, Router, estilos base (sem regra de negócio)
├── pages/      # Contêineres de rota puros (sem JSX complexo ou lógica de negócio)
├── widgets/    # Componentes de integração multi-feature (ex: Header, Sidebar, AppLayout)
├── features/   # Fatias verticais de domínio (auth, dashboard, devices, rooms, device-groups)
└── core/       # Código genérico/compartilhado (apiClient, UI atômica, hooks puros, logger, errors)
```

> **Regra de Ouro**: Features **nunca** importam componentes ou hooks entre si diretamente. A comunicação entre domínios é feita via Zustand store ou pela camada de `widgets/`.

### 2. Esteira Unidirecional de Implementação de Features
Toda nova feature deve seguir estritamente os 5 passos:
1. `types/`: Interfaces que espelham os DTOs em camelCase do C# + Schemas Zod espelhando o FluentValidation.
2. `api/`: Funções assíncronas puras com `apiClient` (Axios) tipadas e com tratamento via `handleApplicationError` (proibido importar hooks aqui).
3. `hooks/`: Query Key Factory (`[feature].keys.ts` com `as const`) + Hooks TanStack Query (`useQuery` / `useMutation`).
4. `store/`: Store Zustand (`[feature]-ui.store.ts`) para estado de UI efêmero (modais, busca, abas).
5. `components/` & `pages/`: Componentes visuais com formulários (RHF + Zod), Skeletons e modais/Sheets laterais.

### 3. Gerenciamento de Estado
- **Server State (TanStack Query v5)**: Único responsável por chamadas HTTP, cache, polling e Optimistic UI com rollback em erros.
- **Client State (Zustand)**: Apenas estado efêmero e síncrono da UI. **Zero requisições HTTP dentro do Zustand**.

### 4. Boas Práticas de Código TypeScript & Biome
- **Proibição do `any`**: Tipagem estrita com interfaces ou `unknown` + Type Guards.
- **Compatibilidade com `erasableSyntaxOnly` (Vite)**:
  - Declarar propriedades de classes explicitamente no corpo antes do construtor (sem modificadores `public readonly` direto nos parâmetros do construtor).
  - Usar Optional Chaining (`data?.property`) em vez de checagens redundantes.
- **Formulários**:
  - React Hook Form com `mode: "onSubmit"` e `reValidateMode: "onChange"`.
  - Tag obrigatória `<form noValidate>`.
  - Prevenção de Layout Shift (CLS): reservar `min-h-[18px]` para áreas de mensagens de erro.
- **Renderização e Listas**:
  - Sempre usar identificadores reais e únicos (`key={item.id}`) em `.map()` — **proibido usar `index` como key**.
- **Observabilidade**: Proibido `console.log`/`console.error`. Usar a fachada `Logger` (`core/logger/app.logger.ts`).

---

## 🎨 UI/UX & Design System (Dark Mode First)

- **Paleta Oficial (Warm Dark Surface)**: substitui o preto/zinc puro anterior por tons quentes de superfície. Definida como cores oficiais do app (migração global gradual — features novas devem seguir esta paleta; um retrofit completo de componentes legados e suporte a temas personalizados fica para depois):
  - Fundo (`bg-[#141314]`), sidebar/header (mesmo tom, já aplicado em `AppLayout`/`Sidebar`/`Header`).
  - Camadas de superfície: `#1c1b1c` (low) → `#201f20` (container) → `#2a2a2a` (high) → `#353435` (highest/pills).
  - Bordas sutis: `#46464b` em opacidade baixa (`/20` a `/40`) — nunca em opacidade total, senão a linha fica marcada demais.
  - Acentos funcionais: primário/neutro `#c5c6cf` (texto `#2e3037`), iluminação (âmbar/areia) `#d3c4b8` (texto `#382f27`), clima (azul-acinzentado) `#c4c6d2` (texto `#2d303a`), alerta/offline `#93000a` (container `/20`, borda `/50`, texto `#ffb4ab`).
  - Texto: `#e5e2e2` (principal), `#c7c6cb` (secundário/labels uppercase).
  - Glows/gradientes: sutis (`shadow-[0_0_8px_rgba(...,0.2)]`), nunca `0.3+` de opacidade — fica pesado demais. Superfícies (cards, pills, botões) podem levar leve `bg-gradient-to-b`/`to-br` entre dois tons próximos da mesma camada, nunca gradientes contrastantes.
  - Referência viva de aplicação: `src/features/devices/` (`DeviceCard.tsx`, `DevicesToolbar.tsx`, `DevicesGlanceBar.tsx`, `DevicesHeader.tsx`).
- **Espaçamento (Grid 8px)**:
  - Label ⇄ Input: `gap-1.5` ou `space-y-1.5`
  - Entre campos da mesma seção: `space-y-3` a `space-y-4`
  - Entre seções do formulário: `space-y-6`
- **Transições e Acessibilidade**:
  - Respeitar a diretiva `prefers-reduced-motion`.
  - Manter Skeletons e estados de loading (`Loader2`) proporcionais ao layout final durante requisições assíncronas.