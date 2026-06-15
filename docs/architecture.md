# 🏛️ Diretrizes Arquiteturais e Padrões de Código

## 1. Padrões de Domínio e Banco de Dados

### 1.1. O Padrão de Tempo (UTC Absoluto)
Salvar datas em UTC é o padrão ouro absoluto. O back-end nunca se preocupa com fusos horários.
O fluxo correto usando `DateTimeOffset` em UTC é:
1. O hardware envia o dado.
2. O C# carimba exatamente o "agora" em UTC (ex: `2026-06-09 01:24:00Z`).
3. O front-end (React/Flutter) recebe o UTC e o navegador converte automaticamente para o fuso horário local na hora de desenhar os gráficos.

### 1.2. Gerenciamento de Entidades e Crescimento (DDD e Testes)
Conforme o monólito cresce, adotamos defesas arquiteturais:
* **Agregados (DDD):** Tratamos as raízes (ex: `Device`). O código nunca manipula o `DeviceTelemetryLog` solto, ele passa pelas regras do Device.
* **Testes de Arquitetura (NetArchTest):** Testes em C# que validam o próprio código (ex: obrigar toda entidade "Log" a ter um `Timestamp`).
* **Diagramas (Mermaid.js):** Para prever impactos visuais de novas tabelas.

## 2. Padrões de Projeto do Back-end

### 2.1. Arquitetura CQRS de Alta Performance
Utilizamos o pacote Mediator (com Source Generators) em vez do MediatR tradicional. O código é gerado em tempo de compilação, eliminando Reflection e garantindo zero alocação de memória desnecessária — crucial para alta volumetria IoT.

### 2.2. Tratamento de Erros Híbrido (70% Result / 30% Exceptions)
* **Result Pattern:** Usado para falhas esperadas de negócio (validação falhou, dispositivo offline) através de records `Result` e `Error` alocados em `Domain.Common.Primitives`.
* **Exceptions:** Lançadas estritamente para bugs lógicos ou falhas de infraestrutura catastróficas. Interceptadas pelo `GlobalExceptionHandler` devolvendo um `ProblemDetails` (RFC 7807) com `TraceId`.

### 2.3. Pipeline de Validação e Entrada de Dados
* **FluentValidation:** Atua como Middleware (Pipeline Behavior) barrando comandos inválidos e retornando 400 Bad Request antes de alcançarem os Handlers.
* **Strict In, Tolerant Out:** Commands de entrada são rigorosos (propriedades obrigatórias), enquanto as queries e saídas aceitam nulos, mantendo o front-end ciente da realidade do banco.
* **Atualizações (PUT vs PATCH):** Adotado PUT retornando o objeto atualizado (200 OK) para simplificar a manipulação de estado global do front-end.

## 3. Padrões de Código e Convenções (C#)

### 3.1. Nomenclatura CQRS
* **Commands:** Verbo + Substantivo + Command (Ex: `CreateRoomCommand`).
* **Queries:** Verbo + Substantivo + Query (Ex: `GetRoomsQuery`).
* **Handlers:** Nome exato do Command/Query + Handler (Ex: `CreateRoomCommandHandler`).

### 3.2. Organização Física
Record do Command na primeira linha do arquivo; Validator e Handler logo abaixo. Construtores primários do C# 12 para injeção de dependência.

### 3.3. Rotas RESTful
Idioma em inglês, kebab-case, substantivos no plural (Ex: `GET /api/device-groups`).

## 4. Documentação e Qualidade de Código

### 4.1. Documentação da API (OpenAPI e Scalar)
A biblioteca Swagger/Swashbuckle foi aposentada. O projeto gera o arquivo OpenAPI nativo (.NET 8/9) e a interface de consumo do front-end é o **Scalar**, que oferece uma Developer Experience veloz e moderna.

### 4.2. Clean Code > Comentários
O código deve ser autoadocumentado com nomes claros. Comentários (`///`) são exclusivos para:
* Documentar **o porquê** (decisões de negócio, *workarounds* de hardware de terceiros).
* Interfaces complexas compartilhadas entre times.
* Nunca explicar "o que" o código está fazendo.

### 4.3. Git Hooks e Formatação
* **C#:** Formatação opinativa estrita via `CSharpier` rodando no salvamento de arquivos.
* **Front-end:** Linting e formatação ultravelozes em Rust utilizando o `Biome`.
* **Husky + lint-staged:** Bloqueia commits locais que não passem nas regras de formatação.

## 5. Organização do Workspace (Hoppscotch / Postman)
A coleção segue o ciclo de vida do recurso e cardinalidade (plural/singular):
* 📁 **Smart Home Hub** (Variáveis: `{{base_url}}`, `{{firebase_token}}`)
  * 📁 **Rooms**
    * GET Get Rooms (`/api/rooms`)
    * GET Get Room by ID (`/api/rooms/{{room_id}}`)
    * POST Create Room (`/api/rooms`)
    * PUT Update Room (`/api/rooms/{{room_id}}`)
    * DELETE Delete Room (`/api/rooms/{{room_id}}`)