# ⚛️ Diretrizes Arquiteturais e Padrões de Código (Front-end)

Este documento define as regras de engenharia de software, UI/UX e arquitetura adotadas no projeto React/TypeScript para garantir que o front-end seja tão resiliente, previsível e escalável quanto a API C#.

---

## 1. Padrões de Arquitetura e Domínio (FSD)

### 1.1. Feature-Sliced Design (FSD) Estrito

O projeto abandona a separação ultrapassada por tipo de arquivo (todas as telas juntas, todos os hooks juntos) e adota fatias de domínio. A dependência flui estritamente de cima para baixo:

| Camada | Responsabilidade |
|---|---|
| `app/` | Orquestrador global (Providers, Router). Não contém regra de negócio. |
| `pages/` | Contêineres de rotas. Apenas unem layouts e injetam parâmetros da URL. |
| `widgets/` | **Camada de Integração (Opcional).** O único local onde é permitido cruzar domínios. Usado estritamente para blocos estruturais que consomem múltiplas features (ex: um `Header` que une UI genérica + estado de `auth` + dropdown de `notifications`). |
| `features/` | Onde a mágica acontece. Fatias de domínio isoladas (ex: `auth`, `dashboard`). Se a feature for removida, o resto do app não quebra. |
| `core/` | Código puramente genérico e agnóstico (UI atômica, cliente Axios, formatadores). **Proibido** importar de qualquer camada acima. |

> **Regra de ouro:** features **nunca importam entre si diretamente**. Se `dashboard` precisa saber o usuário logado, ele consome a store de `auth` — nunca importa um componente de dentro de `auth/components/`.

> **Sobre o `widgets/`:** Crie esta pasta apenas quando o primeiro componente multi-feature aparecer de verdade. Colocar o componente no `core/` violaria o isolamento da base; colocá-lo em outra `feature/` criaria acoplamento horizontal proibido; colocá-lo em `pages/` sujaria a responsabilidade da camada de rota. O `widgets/` é o único terreno neutro para esses casos.

### 1.2. O Padrão de Tempo (Apresentação Local)

- A API trafega datas estritamente em **UTC Absoluto** (ex: `2026-06-09T01:24:00Z`).
- O front-end **nunca** envia datas com fuso horário manual para a API.
- **Apresentação:** A conversão do UTC para o fuso horário do usuário ocorre exclusivamente na camada visual (JSX/Componentes) utilizando a API nativa `Intl.DateTimeFormat` ou funções utilitárias puras em `core/utils/date.ts`.

---

## 2. Padrões de Gerenciamento de Estado e Rede

### 2.1. Separação de Estado (Server vs Client)

O gerenciamento de estado é segregado para evitar gargalos de renderização e sincronização falsa:

- **Server State (TanStack Query):** Único responsável por cache, retry, polling de telemetria e comunicação assíncrona com o C#.
- **Client State (Zustand):** Reservado estritamente para estado efêmero e síncrono da UI (ex: abas ativas, tema dark/light, preferências de filtro locais) ou para espelhar o token de sessão do usuário. **Nenhuma requisição HTTP é feita dentro de uma store do Zustand.**

### 2.2. Consumo de Erros e ProblemDetails (RFC 7807)

A API C# devolve falhas através do padrão `ProblemDetails`. O front-end espelha essa previsibilidade:

- As funções na camada `api/` **nunca** deixam exceções puras (genéricas) vazarem para a interface.
- Os blocos `catch (error: unknown)` utilizam o utilitário `handleApplicationError` para parsear o `ProblemDetails` e transformá-lo em uma classe nativa `AppError`.
- O front-end mapeia os Status Codes previsíveis para feedbacks visuais consistentes:

| Status | Feedback |
|---|---|
| `400` / `422` | Erros de campo via Zod no formulário |
| `401` / `403` | Toast global + redirecionamento |
| `500` | Toast global de infraestrutura |

### 2.3. Pipeline de Validação e UI/UX (Strict In)

As requisições enviadas ao C# devem ser validadas no cliente antes de consumirem rede:

- **Zod + RHF:** Usados em conjunto para espelhar as regras do FluentValidation do back-end.
- **Validação Progressiva:** O React Hook Form é configurado com `mode: "onSubmit"` (presume a inocência do usuário na digitação inicial) e `reValidateMode: "onChange"` (após o primeiro erro, revalida em tempo real enquanto o usuário corrige).

```typescript
useForm({
    mode: "onSubmit",           // primeira validação só no submit
    reValidateMode: "onChange", // depois do primeiro erro, valida em tempo real
})
```

- **`noValidate`:** É obrigatório o uso da tag `<form noValidate>` para suprimir os tooltips nativos dos navegadores e garantir que o Zod controle a UI de forma exclusiva.

---

## 3. Padrões de Código e Convenções (TypeScript)

### 3.1. Nomenclatura e Tipagem

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componentes Visuais | `PascalCase.tsx` | `EnergyChart.tsx`, `DashboardLayout.tsx` |
| Hooks | `camelCase.ts` (prefixo `use`) | `useDashboardMetrics.ts` |
| Contratos/Types | `nome.types.ts` | `telemetry.types.ts` |
| Endpoints/Axios | `nome.api.ts` | `auth.api.ts` |
| Estado Global | `nome.store.ts` | `auth.store.ts` |

### 3.2. Fim do `any` e Interfaces Rigorosas

- O uso de `any` é **estritamente proibido** em toda a base de código.
- Todos os contratos de API consumidos pelo Axios devem ser tipados por interfaces que espelham perfeitamente as propriedades retornadas pelo C# (em `camelCase`, resolvidos pelo serializador do .NET).
- Eventos de tipagem desconhecida devem utilizar `unknown` e passar por **Type Guards** antes da manipulação.

### 3.3. Manipulação de Paginação e Listas

Quando a API retorna a interface `PagedResult<T>`:

- O front-end tipa a resposta globalmente como `PagedResponse<T>` no diretório `core/types/`.
- Para renderização de listas no JSX via `.map()`, a propriedade `key` deve obrigatoriamente receber um **identificador único e real** da entidade (ex: `item.id`). O uso do parâmetro `index` como chave é **proibido** para evitar falhas na reconciliação do Virtual DOM e queda de performance.

---

## 4. Observabilidade e Performance

### 4.1. Camada de Logs (Proibição do Console)

O uso de `console.log`, `console.warn` ou `console.error` isolados é **banido**.

Para evitar vazamento de dados sensíveis em produção, qualquer rastro de execução deve passar pelo `AppLogger` (`core/logger/app.logger.ts`). O Logger centralizado descarta logs em produção ou os direciona silenciosamente para ferramentas de observabilidade (ex: Sentry).

### 4.2. Renderização Otimizada (Zero Acoplamento)

- **Páginas:** Componentes de página (ex: `DashboardPage.tsx`) não devem conter declaração de UI extensiva. Eles orquestram subcomponentes importados de `features/`.
- **Componentes de Gráficos:** Dependências pesadas como o Recharts devem possuir invólucros (`ResponsiveContainer`) garantindo a fluidez em layouts Mobile First.

---

## 5. Ferramentas e Qualidade de Código

### 5.1. Importações (Imports)

- **Cross-Feature / Global:** Devem utilizar obrigatoriamente o Path Alias absoluto (`@/components/...`). **Proibido** o uso de `../../../`.
- **Internal-Feature:** O uso de caminhos relativos (`./` ou `../`) é **exigido** dentro da mesma feature para garantir encapsulamento e portabilidade da pasta.

### 5.2. Formatação e Linter (Biome)

Substituímos o combo Prettier/ESLint pelo **Biome**.

O código passa por checagem estrita de acessibilidade, memory leaks e padronização a cada salvamento do arquivo, garantindo a integridade contínua do projeto de forma nativa e ultra veloz.