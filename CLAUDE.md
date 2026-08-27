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

> Padrão **universal e obrigatório** para todo o frontend (não só telas novas) — validado e aplicado em auditorias de consistência sobre Automações, `AppLayout`/Header/Sidebar, Dashboard e Dispositivos. Tabela completa com exemplos de antes/depois em `frontend/docs/ui-and-design-system.md`. **Proibido criar token novo de cor/espaçamento/raio** — usar exclusivamente os já definidos em `index.css`/`@theme inline` (`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--muted-foreground`, `--surface-container/high/highest`, `--warm`, `--alert`, `--border`, `--border-subtle`, `--radius-sm` a `--radius-4xl`).

- **Paleta Oficial (Warm Dark Surface)**: substitui o preto/zinc puro anterior por tons quentes de superfície. Definida como cores oficiais do app (migração global gradual — features novas devem seguir esta paleta; um retrofit completo de componentes legados e suporte a temas personalizados fica para depois):
  - Fundo (`bg-[#141314]`), sidebar/header (mesmo tom, já aplicado em `AppLayout`/`Sidebar`/`Header`).
  - Camadas de superfície: `#1c1b1c` (low) → `#201f20` (container) → `#2a2a2a` (high) → `#353435` (highest/pills).
  - Bordas sutis: `#46464b` em opacidade baixa (`/20` a `/40`) — nunca em opacidade total, senão a linha fica marcada demais.
  - Acentos funcionais: primário/neutro `#c5c6cf` (texto `#2e3037`), iluminação (âmbar/areia) `#d3c4b8` (texto `#382f27`), clima (azul-acinzentado) `#c4c6d2` (texto `#2d303a`), alerta/offline `#93000a` (container `/20`, borda `/50`, texto `#ffb4ab`).
  - Texto: `#e5e2e2` (principal), `#c7c6cb` (secundário/labels uppercase).
  - Glows/gradientes: sutis (`shadow-[0_0_8px_rgba(...,0.2)]`), nunca `0.3+` de opacidade — fica pesado demais. Superfícies (cards, pills, botões) podem levar leve `bg-gradient-to-b`/`to-br` entre dois tons próximos da mesma camada, nunca gradientes contrastantes. **Nunca usar um stop de gradiente em hex arbitrário sem token equivalente** (ex.: `from-surface-high to-[#232323]`) — achatar pra uma cor sólida do token mais próximo, ou usar `hover:brightness-110`/`95` quando precisar de "clarear/escurecer" além do tom mais claro/escuro já definido na escada.
  - Referência viva de aplicação: `src/features/devices/` (`DeviceCard.tsx`, `DevicesToolbar.tsx`, `DevicesGlanceBar.tsx`, `DevicesHeader.tsx`).
- **Espaçamento (grid de 4px)** — todo padding/gap deve cair em uma destas 5 paradas; eliminar valores "quebrados" (`p-3`, `p-5`, `gap-1.5`, `py-1.5`, `mb-5`) sem justificativa específica:
  | Tamanho | Classes | Uso |
  |---|---|---|
  | 4px | `p-1` / `gap-1` | ícone ⇄ texto em elementos pequenos (badges, botões compactos) |
  | 8px | `p-2` / `gap-2` | padding interno de pills de filtro; espaço entre itens de lista compacta |
  | 16px | `p-4` / `gap-4` | padding padrão de cards, inputs de formulário, seções de modal |
  | 24px | `p-6` / `gap-6` | padding de containers principais (painel de detalhe, corpo do modal); espaço entre seções distintas |
  | 32px | `p-8` / `gap-8` | margem externa entre o limite da tela e o início do conteúdo principal |

  Exceções sancionadas (não são "quebradas"): Label ⇄ Input `gap-1.5`/`space-y-1.5`; campos da mesma seção de formulário `space-y-3` a `space-y-4`; Input ⇄ mensagem de erro `mt-1`.
- **Raio aninhado**: o container externo usa sempre um raio maior que o do elemento filho — nunca o mesmo raio (fica "torto") nem um filho com raio maior que o pai. Ex.: painel/lista externa `rounded-xl` → cards/blocos internos `rounded-lg` → badges/pills internos `rounded-full`. Usar somente a escada `--radius-sm/md/lg/xl/2xl/3xl/4xl`, nunca `rounded` bare (não é um dos tokens) nem valores arbitrários.
- **Contraste de superfície (elevação)**: container pai sempre numa superfície mais escura que o filho direto, seguindo `background`/`muted` (surface-low) → `popover` (surface-container) → `card` (surface-high) → `surface-highest`, nunca o inverso. Um Dialog/modal já nasce em `bg-popover` (surface-container) — cards internos dele devem ser `bg-surface-high`, não `bg-surface-container` de novo (mesmo nível do próprio modal).
- **Escala tipográfica**:
  | Papel | Classes |
  |---|---|
  | Título principal da tela | `text-2xl` a `text-3xl`, `font-semibold` |
  | Título de card/seção | `text-lg` a `text-xl`, `font-medium` |
  | Corpo de texto (descrições, resumos) | `text-sm`, `font-normal`, `text-muted-foreground` |
  | Labels/micro (status, cabeçalhos de bloco tipo "GATILHO") | `text-xs`, `font-medium`, `uppercase`, `tracking-wider` |

  Nunca usar tamanho arbitrário (`text-[10px]`, `text-[11px]`) — o piso da escala é `text-xs`. Valores KPI em destaque (`text-2xl`) usam `font-semibold`, nunca `font-bold`.
- **Componentização estrita**:
  - Pills de filtro: `h-8` fixo, `px-3` ou `px-4`, `text-sm`, `transition-colors` no hover — nunca altura variável via `py-*`.
  - Itens de lista (modo lista): `flex items-center justify-between`, `p-3` ou `p-4`, divisor via `divide-y` no container pai (não `border-b` por item — isso deixa borda sobrando no último item).
  - KPIs (faixas de resumo/métricas): `flex flex-col gap-1`, label acima `text-xs uppercase text-muted-foreground` (com `truncate`/`min-w-0` se o rótulo for longo, pra não quebrar linha e desalinhar a grade), valor abaixo em destaque `text-2xl font-semibold` usando cor de destaque do design system (`text-primary`, `text-warm`, `text-cool`, `text-alert-foreground`) — nunca uma cor nova.
- **Scroll**:
  - Listas/painéis internos com rolagem própria usam a utilidade `.scrollbar-thin` (já definida em `animations.css`) em vez da scrollbar padrão do navegador.
  - Modais/wizards cujo conteúdo pode cortar ao rolar ganham um indicador de fade-out: `<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-<superfície-ambiente> to-transparent" />` dentro de um wrapper `relative`, com o tom de origem igual ao `bg-*` do próprio container (`from-surface-low` num painel, `from-popover` dentro de um Dialog, etc.) — nunca uma cor fixa diferente da superfície real.
- **Transições e Acessibilidade**:
  - Respeitar a diretiva `prefers-reduced-motion`.
  - Manter Skeletons e estados de loading (`Loader2`) proporcionais ao layout final durante requisições assíncronas.