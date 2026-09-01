# ⚛️ Diretrizes Arquiteturais e Padrões de Código (Front-end)

Este documento define as regras de engenharia de software, UI/UX e arquitetura adotadas no projeto React/TypeScript para garantir que o front-end seja tão resiliente, previsível e escalável quanto a API C#.

## Sumário

1. [Padrões de Arquitetura e Domínio (FSD)](#1-padrões-de-arquitetura-e-domínio-fsd)
2. [Padrões de Gerenciamento de Estado e Rede](#2-padrões-de-gerenciamento-de-estado-e-rede)
3. [Padrões de Código e Convenções (TypeScript)](#3-padrões-de-código-e-convenções-typescript)
4. [Observabilidade e Performance](#4-observabilidade-e-performance)
5. [Ferramentas e Qualidade de Código](#5-ferramentas-e-qualidade-de-código)

---

## 1. Padrões de Arquitetura e Domínio (FSD)

### 1.1. Feature-Sliced Design (FSD) Estrito

O projeto abandona a separação ultrapassada por tipo de arquivo (todas as telas juntas, todos os hooks juntos) e adota fatias de domínio. A dependência flui estritamente de cima para baixo:

| Camada | Responsabilidade |
|---|---|
| `app/` | Orquestrador global (Providers, Router). Não contém regra de negócio. |
| `pages/` | Contêineres de rotas. Apenas unem layouts e injetam parâmetros da URL. |
| `widgets/` | Camada de Integração (Opcional). O único local onde é permitido cruzar domínios. Usado estritamente para blocos estruturais que consomem múltiplas features (ex: o `AppLayout` que une UI genérica + estado de `auth` no `Header`/`Sidebar`). |
| `features/` | Onde a mágica acontece. Fatias de domínio isoladas (ex: `auth`, `history`, `automations`). Se a feature for removida, o resto do app não quebra. |
| `core/` | Código puramente genérico e agnóstico (UI atômica, cliente Axios, formatadores). Proibido importar de qualquer camada acima. |

> **Regra de ouro**: `features` nunca importam entre si diretamente. Se `dashboard` precisa saber o usuário logado, ele consome a store de `auth` — nunca importa um componente de dentro de `auth/components/`.

**Sobre o `widgets/`**: crie esta pasta apenas quando o primeiro componente multi-feature aparecer de verdade. Colocar o componente no `core/` violaria o isolamento da base; colocá-lo em outra `feature/` criaria acoplamento horizontal proibido; colocá-lo em `pages/` sujaria a responsabilidade da camada de rota. O `widgets/` é o único terreno neutro para esses casos — hoje isso vive em `widgets/layout/` (`AppLayout.tsx`, `AuthLayout.tsx`, `Header.tsx`, `Sidebar.tsx`).

### 1.2. O Padrão de Tempo (Apresentação Local)

A API trafega datas estritamente em **UTC Absoluto** (ex: `2026-06-09T01:24:00Z`).

- O front-end **nunca** envia datas com fuso horário manual para a API.
- **Apresentação**: a conversão do UTC para o fuso horário do usuário ocorre exclusivamente na camada visual (JSX/Componentes), utilizando a API nativa `Intl.DateTimeFormat` ou funções utilitárias puras em `core/utils/date.ts`.

### 1.3. O Fluxo Unidirecional de Implementação de Feature

Ao construir qualquer nova fatia vertical (ex: `rooms`, `devices`), siga estritamente a esteira de 5 passos:

1. CONTRATOS (`types/`)
   └─► 2. REDE (`api/`)
       └─► 3. ESTADO ASSÍNCRONO (`hooks/`)
           └─► 4. ESTADO DE CLIENTE (`store/`)
               └─► 5. INTERFACE (`components/` e `pages/`)

#### Onde encontrar os contratos no C# (.NET):
- **Response DTOs (Consulta):** `SmartHomeHub.Application/**/Queries/` (ex: `GetEventHistoryQuery.cs`, `EventHistoryDto`). Define o JSON em camelCase retornado para o front-end.
- **Request DTOs (Criação/Edição):** `SmartHomeHub.Application/**/Commands/` (ex: `SetDeviceStateCommand.cs`).
- **Espelhamento Zod ⇄ FluentValidation:** O Zod atua na camada visual como primeira linha de defesa (*UX First*). Se o backend possui validações estritas (ex: regex de MAC, unicidade ou tamanho mínimo), o schema Zod correspondente deve espelhar essas restrições para evitar erros `400/422` desnecessários.

---

## 2. Padrões de Gerenciamento de Estado e Rede

### 2.1. Separação de Estado (Server vs Client)

O gerenciamento de estado é segregado para evitar gargalos de renderização e sincronização falsa:

- **Server State (TanStack Query)**: único responsável por cache, retry, polling de telemetria e comunicação assíncrona com o C#.
- **Client State (Zustand)**: reservado estritamente para estado efêmero e síncrono da UI (ex: abas ativas, tema dark/light, preferências de filtro locais) ou para espelhar o token de sessão do usuário. Nenhuma requisição HTTP é feita dentro de uma store do Zustand.

### 2.2. Hierarquia e Fábrica de Chaves de Cache (Query Key Factory)

Para evitar erros de digitação (typos) e falhas silenciosas na invalidação de cache, **fica estritamente proibido** o uso de strings soltas ou arrays literais declarados diretamente na propriedade `queryKey` do TanStack Query.

- **Colocalização Reversa**: o arquivo de chaves deve morar obrigatoriamente dentro da pasta de hooks da funcionalidade (`features/[feature]/hooks/[feature].keys.ts`) — é exatamente assim que `history.keys.ts` e `automations.keys.ts` já estão organizados.
- **Tuplas Imutáveis**: todas as chaves geradas devem utilizar a asserção `as const` para garantir integridade e tipagem estrita em tempo de compilação.
- **Estrutura Determinística**: toda a árvore de chaves deve herdar uma raiz global hierárquica, permitindo invalidações parciais em cascata (padrão Big Tech).

```ts
// features/history/hooks/history.keys.ts
export const historyKeys = {
    all: ["history"] as const,
    lists: () => [...historyKeys.all, "list"] as const,
    list: (params: GetHistoryParams) => [...historyKeys.lists(), { params }] as const,
};
```

### 2.3. Consumo de Erros e ProblemDetails (RFC 7807)

A API C# devolve falhas através do padrão `ProblemDetails`. O front-end espelha essa previsibilidade:

- As funções na camada `api/` nunca deixam exceções puras (genéricas) vazarem para a interface.
- Os blocos `catch (error: unknown)` utilizam o utilitário `handleApplicationError` (`core/errors/app.errors.ts`) para parsear o `ProblemDetails` e transformá-lo em uma classe nativa `AppError`.
- O front-end mapeia os Status Codes previsíveis para feedbacks visuais consistentes:

| Status | Feedback |
|---|---|
| 400 / 422 | Erros de campo via Zod no formulário |
| 401 / 403 | Toast global + redirecionamento |
| 500 | Toast global de infraestrutura |

### 2.4. Pipeline de Validação e UI/UX (Strict In)

As requisições enviadas ao C# devem ser validadas no cliente antes de consumirem rede:

- **Zod + RHF**: usados em conjunto para espelhar as regras do `FluentValidation` do back-end.
- **Validação Progressiva**: o React Hook Form é configurado com `mode: "onSubmit"` (presume a inocência do usuário na digitação inicial) e `reValidateMode: "onChange"` (após o primeiro erro, revalida em tempo real enquanto o usuário corrige).

```ts
useForm({
    mode: "onSubmit",           // primeira validação só no submit
    reValidateMode: "onChange", // depois do primeiro erro, valida em tempo real
})
```

- **`noValidate`**: é obrigatório o uso da tag `<form noValidate>` para suprimir os tooltips nativos dos navegadores e garantir que o Zod controle a UI de forma exclusiva.

### 2.5. Boas Práticas da Camada de API (`[feature].api.ts`)

1. **Funções Puras e Desacopladas de Hooks:** As funções em `.api.ts` são exclusivamente assíncronas puras (`async/await`). **É proibido importar hooks do React ou do TanStack Query** neste arquivo. A camada de rede deve ser consumível em workers, scripts ou testes sem depender do ciclo de vida da UI.
2. **Mapeamento de Rotas C#:** Espelhe os atributos das Controllers ou Minimal APIs (`[Route("api/[controller]")]`, `[HttpGet]`, `[HttpPut("{id}")]`).
3. **Desempacotamento de Paginação (`PagedResponse<T>`, `core/types/pagination.types.ts`):** Em endpoints de listagem, trate tanto retornos diretos (`T[]`) quanto respostas paginadas (`PagedResponse<T>` contendo `{ items: T[], totalCount, page }`).

### 2.6. Boas Práticas para Stores de UI (`[feature]-ui.store.ts`)

- **Zero Estado Assíncrono:** Nunca realize `fetch`/HTTP nem armazene dados de banco dentro do Zustand.
- **Ações Semânticas Declarativas:** Prefira métodos que expressem intenção (`openCreateSheet()`, `closeCreateSheet()`, `openEditSheet(entity)`) em vez de setters genéricos.
- **Reset de Interface:** Sempre forneça uma função `resetFilters()` para facilitar botões de limpeza e trocas de rota sem retenção de lixo de estado.
- **Exceção histórica:** `auth` foge do padrão de nome e usa `useAuthStore.ts` (estilo hook) em vez de `auth-ui.store.ts` — mantenha essa exceção em mente ao procurar a store de sessão.

---

## 3. Padrões de Código e Convenções (TypeScript)

### 3.1. Nomenclatura e Tipagem

| Tipo | Padrão | Exemplo real |
|---|---|---|
| Componentes Visuais | `PascalCase.tsx` | `DeviceEnergyChart.tsx`, `AppLayout.tsx` |
| Hooks | `camelCase.ts` (prefixo `use`) | `useEventHistory.ts` |
| Chaves de Cache | `nome.keys.ts` | `automations.keys.ts` |
| Contratos/Types | `nome.types.ts` | `history.types.ts` |
| Endpoints/Axios | `nome.api.ts` | `automations.api.ts` |
| Estado Global (UI) | `nome-ui.store.ts` | `history-ui.store.ts` (exceção: `auth` usa `useAuthStore.ts`) |

### 3.2. Fim do `any` e Interfaces Rigorosas

- O uso de `any` é estritamente proibido em toda a base de código.
- Todos os contratos de API consumidos pelo Axios devem ser tipados por interfaces que espelham perfeitamente as propriedades retornadas pelo C# (em `camelCase`, resolvidos pelo serializador do .NET).
- Eventos de tipagem desconhecida devem utilizar `unknown` e passar por *Type Guards* antes da manipulação.

### 3.3. Manipulação de Paginação e Listas

Quando a API retorna a interface `PagedResult<T>`:

- O front-end tipa a resposta globalmente como `PagedResponse<T>` no diretório `core/types/`.
- Para renderização de listas no JSX via `.map()`, a propriedade `key` deve obrigatoriamente receber um identificador único e real da entidade (ex: `item.id`). O uso do parâmetro `index` como chave é **proibido** para evitar falhas na reconciliação do Virtual DOM e queda de performance.

### 3.4. Sintaxe Moderna e Limitações do Compilador (Vite/Biome)

Para garantir a compatibilidade com empacotadores ultra velozes (que operam sob a flag `erasableSyntaxOnly`) e satisfazer o rigor do linter, as seguintes regras sintáticas são obrigatórias:

**Construtores Clássicos**

É proibido o uso de modificadores de acesso direto nos parâmetros do construtor. As propriedades devem ser declaradas de forma explícita no corpo da classe e atribuídas manualmente dentro do construtor — é exatamente assim que `AppError` (`core/errors/app.errors.ts`) já é implementada:

```ts
// ❌ Proibido
class AppError {
    constructor(public readonly message: string) {}
}

// ✅ Correto — implementação real do projeto
export class AppError extends Error {
    public readonly status: number;
    public readonly details?: ProblemDetails;
    public readonly originalError?: unknown;

    constructor(message: string, status: number = 500, details?: ProblemDetails, originalError?: unknown) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.details = details;
        this.originalError = originalError;
    }
}
```

**Optional Chaining**

É proibido o uso de verificações condicionais redundantes para aninhamento de objetos. Deve-se utilizar estritamente o Optional Chaining nativo do TypeScript para manter o código limpo.

```ts
// ❌ Proibido
if (data && data.title) { ... }

// ✅ Correto
if (data?.title) { ... }
```

### 3.5. Comentários de Código e Documentação Viva em Inglês (JSDoc)

A documentação no código deve explicar o **PORQUÊ** (a intenção e regra de negócio), nunca o **QUÊ** (o que a sintaxe já deixa óbvio).

- **JSDoc em Interfaces/DTOs (`/** ... */`):** Obrigatório em contratos e utilitários para alimentar os Tooltips e o IntelliSense do TypeScript no editor.
- **Regras Não-Óbvias / Hardware Quirks:** Documente comportamentos específicos de integração com IoT (ex: delays necessários para boot de dispositivos, ou por que um debounce de 800ms existe antes de invalidar telemetria em rajada).
- **Proibição de Código Morto e Comentários Redundantes:** Não comente nomes óbvios de variáveis (ex: `// Nome do usuário -> name: string`) e delete código não utilizado em vez de comentá-lo (use o Git para histórico).

---

## 4. Observabilidade e Performance

### 4.1. Camada de Logs (Proibição do Console)

O uso de `console.log`, `console.warn` ou `console.error` isolados é banido no código de features/páginas.

Para evitar vazamento de dados sensíveis em produção, qualquer rastro de execução deve passar pelo utilitário `Logger` (definido em `core/logger/app.logger.ts`, importado como `import { Logger } from "@/core/logger/app.logger"`). O Logger centralizado descarta logs em produção ou os direciona silenciosamente para ferramentas de observabilidade (ex: Sentry).

### 4.2. Renderização Otimizada (Zero Acoplamento)

- **Páginas**: componentes de página (ex: `HistoryPage.tsx`) não devem conter declaração de UI extensiva. Eles orquestram subcomponentes importados de `features/`.
- **Componentes de Gráficos**: dependências pesadas como o Recharts devem possuir invólucros (`ResponsiveContainer`) garantindo a fluidez em layouts Mobile First.

---

## 5. Ferramentas e Qualidade de Código

### 5.1. Importações (Imports)

- **Cross-Feature / Global**: devem utilizar obrigatoriamente o Path Alias absoluto (ex: `@/core/components/ui/button`, `@/features/history/hooks/useEventHistory`). Proibido o uso de `../../../`.
- **Internal-Feature**: o uso de caminhos relativos (`./` ou `../`) é exigido dentro da mesma feature para garantir encapsulamento e portabilidade da pasta.

### 5.2. Formatação e Linter (Biome)

Substituímos o combo Prettier/ESLint pelo Biome.

O código passa por checagem estrita de acessibilidade, memory leaks e padronização a cada salvamento do arquivo, garantindo a integridade contínua do projeto de forma nativa e ultra veloz.