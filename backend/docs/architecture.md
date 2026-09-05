# 🏛️ Diretrizes Arquiteturais e Padrões de Código

## 1. Padrões de Domínio e Banco de Dados

### 1.1. O Padrão de Tempo (UTC Absoluto)

Salvar datas em UTC é o padrão ouro absoluto. O back-end nunca se preocupa com fusos horários. O fluxo correto usando `DateTimeOffset` em UTC é:

1. O hardware envia o dado.
2. O C# carimba exatamente o "agora" em UTC (ex: `2026-06-09 01:24:00Z`).
3. O front-end (React) recebe o UTC e converte para o fuso horário local exclusivamente na camada visual, via `Intl.DateTimeFormat` (ver `frontend/docs/architecture.md`, seção 1.2).

### 1.2. Gerenciamento de Entidades e Crescimento (DDD)

Conforme o monólito cresce, adotamos defesas arquiteturais:

- **Agregados (DDD):** Tratamos as raízes (ex: `Device`). O código nunca manipula o `DeviceTelemetryLog` solto — ele passa pelas regras do Device.
- **Diagramas (Mermaid.js):** Recomendado para prever impactos visuais de novas tabelas antes de migrar — ainda não formalizado como processo obrigatório no fluxo de PR.

### 1.3. Exceção deliberada: `Database.SqlQuery<T>` para Continuous Aggregates

O projeto é LINQ-to-Entities por padrão — toda consulta contra uma entidade mapeada pelo `AppDbContext` passa por `DbSet<T>`/LINQ, nunca SQL cru. A exceção **intencional** é consultar *Continuous Aggregates* do TimescaleDB (ex: `device_telemetry_daily`, criada via `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)` numa migration): essas views não são entidades do EF Core — não têm `DbSet`, não aparecem no `OnModelCreating`, e o EF não tem como gerar LINQ pra elas.

Pra esse caso específico, `dbContext.Database.SqlQuery<TProjection>($"...")` é o padrão correto, não um desvio a ser "corrigido" de volta pra LINQ numa auditoria futura — desde que a interpolação use sempre `$"..."` (gera `FormattableString`, parametrizado de verdade pelo EF Core) e nunca concatenação manual de string. Ver `GetDeviceTelemetryHistoryQuery.cs` como referência real: junta pontos vindos da tabela bruta (`DeviceTelemetryLogs`, via LINQ normal) com pontos vindos da aggregate (via `SqlQuery<T>`) no mesmo DTO de saída.

### 1.4. Padrão Device Shadow — Estado Estático vs. Live State

A entidade `Device` separa explicitamente metadados estruturais de baixa mutabilidade do estado volátil de alta frequência de escrita (Device Shadow / Digital Twin, análogo aos padrões do **AWS IoT Device Shadow** e **Azure Digital Twins**).

Não utilizamos herança de classes do EF Core (TPH, TPT ou TPC) nem o antipadrão EAV (Entity-Attribute-Value). A modelagem adota **composição 1:1 estrita**:
- `Device`: registro mestre relacional (Name, Brand, ExternalId, Type, IntegrationType, UserId, RoomId, Configuration).
- `DeviceLiveState`: entidade satélite enxuta (1:1 com Device via `DeviceId`) armazenando status de conectividade (`IsOnline`, `LastSeenAt`), energia (`IsOn`) e payload dinâmico/semi-estruturado (`Attributes` como JSONB).

Essa separação resolve dois gargalos fundamentais de arquitetura IoT:
1. **Mitigação de MVCC Write Bloat**: Atualizações frequentes de telemetria, sondagens de rede e comandos de toggle reescrevem apenas a tupla compacta de `DeviceLiveStates`, eliminando reescritas redundantes das colunas largas de `Devices` (evitando geração desnecessária de dead tuples e pressão sobre o autovacuum no PostgreSQL).
2. **Eliminação de Colunas Esparsas**: Atributos específicos de categoria (iluminação, climatização, segurança) residem no documento JSONB tipado (`DeviceLiveStateAttributes`), impedindo que a tabela principal `Devices` acumule dezenas de colunas com valores nulos.

#### Regra de Decisão para Novos Campos de Dispositivos:
Para qualquer adição futura de categorias de hardware (ex: quando `ClimateControlPanel` receber setpoints e modos de operação reais, ou cortinas/trincos ganharem atributos específicos), siga o critério objetivo:

- **Coluna Relacional (em `Device`)**:
  - Filtrado ou ordenado em queries com frequência (ex: cláusulas `WHERE` / `ORDER BY` indexadas);
  - Referenciado como chave estrangeira (`FK`);
  - Existe universalmente para praticamente qualquer dispositivo físico, independente da categoria de hardware.
- **JSONB `Attributes` (em `DeviceLiveState`)**:
  - Específico de categoria ou subtipo de hardware (ex: `TargetTemperature`, `FanSpeed`, `OpenPercentage`, `PinCodeRequired`);
  - Lido como objeto composto (deserializado junto ao DTO de saída, e não filtrado diretamente via operadores JSONB `Attributes->>'campo'`);
  - Necessidade de evolução de schema sem exigir nova migração física de banco de dados.

> **Importante**: O contrato de API (`DeviceDto`) permanece plano. As queries e projeções (via Mapster ou projeção explícita no Handler) realizam a junção entre `Device` e `DeviceLiveState` de forma transparente para o frontend, mantendo retrocompatibilidade total.

### 1.5. `Device.Configuration` Tipada por Protocolo (Value Objects discriminados por `IntegrationType`)

Assim como `DeviceLiveState.Attributes` (seção 1.4), `Device.Configuration` é um documento JSONB — mas, diferente de `Attributes`, o blob único original (`DeviceConfiguration`) misturava campos de protocolos incompatíveis (Tuya local: `LocalKey`, `ProtocolVersion`, `Dps*Key`; MQTT nativo: `ClientKey`, `CommandTopic`, `StateTopic`), sem nenhuma garantia em tempo de compilação de que um dispositivo Tuya não acabasse com campos MQTT (sempre nulos) no documento, e vice-versa. Isso foi corrigido tipando `Configuration` por **três** Value Objects concretos, não dois — a coluna `IntegrationType` tem 10 valores (`TuyaLocal`, `NativeMqtt`, `EspHomeMqtt`, `TuyaBridge`, `GoogleCast`, `LgWebOs`, `AndroidTvAdb`, `Zigbee`, `MdnsZeroconf`, `SsdpUpnp`), e integrações de TV/rede genérica (GoogleCast, LgWebOs, AndroidTvAdb, etc.) já usavam `IpAddress`/`MacAddress` do mesmo blob sem ser nem Tuya nem MQTT:

- **`TuyaDeviceConfiguration`** (`IntegrationType.TuyaLocal`): `LocalKey`, `ProtocolVersion`, `DpsPowerKey`/`DpsBrightnessKey`/`DpsColorKey`/`DpsColorTempKey`, `SupportsColor`, além de IP/MAC.
- **`MqttDeviceConfiguration`** (`NativeMqtt`, `EspHomeMqtt`): `ClientKey`, `CommandTopic`, `StateTopic`, além de IP (recebido via telemetria, só informativo — MQTT não é "network probeable").
- **`NetworkDeviceConfiguration`** (todo o restante — TV via GoogleCast/LgWebOs/AndroidTvAdb, TuyaBridge, Zigbee, mDNS/SSDP): só IP/MAC.

**Interfaces comuns** — decisão de modelagem: `IpAddress` é o único campo genuinamente universal entre as três categorias (confirmado pelo uso real: MQTT o recebe via `ProcessTelemetryCommand` mesmo não sendo probeável), então vive na interface base `IDeviceConfiguration`. `MacAddress` é compartilhado só por Tuya e Network (Wake-on-LAN de TV), então vive em `INetworkAddressableConfiguration : IDeviceConfiguration`, implementada por `TuyaDeviceConfiguration` e `NetworkDeviceConfiguration` — `MqttDeviceConfiguration` não a implementa. Nenhum outro campo é compartilhado; forçar um campo Tuya-only (ex: `SupportsColor`) para a interface base obrigaria `MqttDeviceConfiguration` a carregar algo que nunca usa, reintroduzindo o problema original.

**Mecanismo de discriminação** — a coluna física `Configuration` continua `jsonb`, sem nenhum discriminador embutido no documento (evita duas fontes de verdade divergentes com `IntegrationType`). Um `ValueConverter<IDeviceConfiguration, string>` sozinho não é suficiente para escolher o tipo concreto na leitura porque não enxerga a coluna irmã `IntegrationType` da mesma linha — por isso a leitura acontece em duas etapas:
1. `DeviceConfigurationValueConverter` (conversor de valor customizado, `Infrastructure/Persistence/Conversions`) desserializa o JSON num placeholder cru (`RawDeviceConfiguration`) e serializa qualquer tipo concreto pelo seu tipo em tempo de execução (`configuration.GetType()`, não o tipo declarado da propriedade).
2. `DeviceConfigurationMaterializationInterceptor` (`IMaterializationInterceptor`) troca esse placeholder pelo tipo concreto certo assim que `Device.IntegrationType` já está materializado na mesma entidade (`DeviceConfigurationTypeResolver.Resolve`), sem exigir nenhuma coluna ou campo extra — só a `IntegrationType` já existente.

Essa combinação (conversor + interceptor) foi escolhida em vez do polimorfismo JSON nativo do EF Core 8+ (`OwnsOne(...).ToJson()` com `HasDiscriminator`, usado por `DeviceLiveState.Attributes` para o caso de tipo único) justamente porque esse mecanismo nativo embutiria um discriminador dentro do próprio documento JSON — o que este projeto evita deliberadamente aqui. Como `Configuration` deixou de ser um Owned Type mapeado via `ToJson()`, o EF Core não traduz mais `device.Configuration.IpAddress` (ou qualquer outro campo) para SQL dentro de um `.Where(...)` — os poucos lugares que faziam esse filtro (`DeviceHealthCheckWorker`, `DeviceStatePollingWorker`, `TuyaDeviceStatePollingWorker`) foram ajustados para filtrar em memória após `ToListAsync()`, aceitável dado o volume de dispositivos de um hub residencial.

**Falha explícita, não silenciosa** — qualquer Handler/Worker que efetivamente opera hardware Tuya faz `if (device.Configuration is not TuyaDeviceConfiguration tuyaConfig) throw new InvalidOperationException(...)` logo após confirmar `IntegrationType == TuyaLocal`, antes de qualquer leitura de campo — capturado pelo `GlobalExceptionHandler` (bug de infraestrutura/dado inconsistente, não falha de negócio esperada). Consultas só-leitura e tolerantes por natureza (ex: `GetDeviceWorkModeQuery`, que já trata "não é Tuya" como "sem dado pra mostrar") tratam o mesmo mismatch como retorno vazio, não exceção.

**Compatibilidade com dados já persistidos** — o JSON antigo (gravado pelo extinto `OwnsOne(...).ToJson()` sobre a classe única `DeviceConfiguration`) usava exatamente os mesmos nomes de propriedade em PascalCase que os novos tipos concretos, e cada categoria simplesmente ignora (via `PropertyNameCaseInsensitive` + comportamento padrão do `System.Text.Json` de descartar propriedades desconhecidas) os campos das outras categorias presentes no blob antigo. **Testado e confirmado 100% compatível campo a campo** (`DeviceConfigurationJsonSerializerTests`, casos `Resolve_Legacy*JsonPreRefactor_ShouldDeserializeWithoutDataLoss`) — **não foi necessária nenhuma migration de dados**, só a migration de schema (vazia, `TypeDeviceConfigurationByProtocol`) que reconcilia o snapshot do EF Core sem alterar o tipo físico da coluna.

**Invariante "Configuration corresponde a IntegrationType" — estrutural no Domain, não só convenção na Application.** Inicialmente essa consistência dependia só de `CreateDeviceCommand`/`UpdateDeviceCommand` lembrarem de reconstruir `Configuration` toda vez que `IntegrationType` mudasse — nada no domínio impedia um Handler novo (ou uma edição futura do Update) esquecer disso, deixando a entidade divergente em memória até o próximo reload (quando o `DeviceConfigurationMaterializationInterceptor` "curava" silenciosamente, mascarando o problema em vez de expô-lo). Isso foi movido pra dentro da própria entidade:

- `Device.ChangeIntegrationType(IntegrationType newType)` é o único caminho que deveria trocar o protocolo de um Device já existente — reconstrói `Configuration` (via `DeviceConfigurationTypeResolver.CreateDefault`) como parte atômica da própria troca, em vez de dois campos setados separadamente por quem chama. `CreateDeviceCommand` e `UpdateDeviceCommand` foram atualizados pra usar este método em vez de reconstruir `Configuration` manualmente.
- Os setters de `IntegrationType`/`Configuration` continuam **públicos** — removê-los quebraria a materialização do EF Core (que precisa setá-los na leitura), o `DeviceConfigurationMaterializationInterceptor` (que os atribui a partir de outro assembly, Infrastructure) e dezenas de seeds de teste que constroem `Device` via object initializer. A invariante, portanto, não é 100% garantida em tempo de compilação — ainda é possível escrever `device.IntegrationType = X; device.Configuration = new TipoErrado()` separadamente em C#.
- Por isso `AppDbContext.SaveChangesAsync` reforça o lado da escrita com uma validação explícita: para toda entrada `Device` em estado `Added`/`Modified`, confere se `Configuration.GetType()` bate com `DeviceConfigurationTypeResolver.Resolve(IntegrationType)` e lança `InvalidOperationException` com mensagem apontando pra `ChangeIntegrationType` caso não bata — barrando a divergência antes dela chegar no banco, em vez de só depender do interceptor de leitura pra escondê-la no próximo reload. Essa validação já pegou um caso real pré-existente numa seed de teste (`GetDevicesTests`) que setava `IntegrationType = TuyaLocal` sem tocar `Configuration`, silenciosamente "curado" até então.
- O `DeviceConfigurationMaterializationInterceptor` (seção acima) continua exatamente como estava — cobre o lado da leitura; esta seção reforça o lado da escrita, sem substituir nada.

Resultado: três camadas de defesa complementares, não uma coisa só — `ChangeIntegrationType` (previne a divergência na origem, pra quem o usa), o guard de `SaveChangesAsync` (barra o que escapar disso antes de persistir) e o `MaterializationInterceptor` (corrige o que já está no banco na leitura). Testes: `DeviceTests` (Domain, `ChangeIntegrationType` sempre produz a categoria certa) e `DeviceConfigurationInvariantTests` (Infrastructure, o guard de `SaveChangesAsync` lança e a mensagem aponta o caminho certo).

---

## 2. Padrões de Projeto do Back-end

### 2.1. Arquitetura CQRS de Alta Performance

Utilizamos o pacote **Mediator** (com Source Generators) em vez do MediatR tradicional. O código é gerado em tempo de compilação, eliminando Reflection e garantindo zero alocação de memória desnecessária — crucial para alta volumetria IoT.

### 2.2. Tratamento de Erros Híbrido (Result / Exceptions)

- **Result Pattern:** Usado para falhas esperadas de negócio (validação falhou, dispositivo offline) através de records `Result` e `Error` alocados em `Domain.Common.Primitives`, com `ResultExtensions` para composição.
- **Exceptions:** Lançadas estritamente para bugs lógicos ou falhas de infraestrutura catastróficas. Interceptadas pelo `GlobalExceptionHandler`, devolvendo um `ProblemDetails` (RFC 7807) com `TraceId`.

Tanto as **Exceptions** (via `GlobalExceptionHandler`) quanto as **falhas de negócio** (Result Pattern via `ResultExtensions`) devolvem o mesmo formato padrão `ProblemDetails` (RFC 7807), garantindo que o front-end consuma um contrato de erro único e previsível (`400`, `403`, `404`, `409`, `422` e `500`).

### 2.3. Pipeline de Validação e Entrada de Dados

- **FluentValidation:** Atua como Pipeline Behavior do Mediator, barrando comandos inválidos e retornando `400 Bad Request` antes de alcançarem os Handlers.
- **Strict In, Tolerant Out:** Commands de entrada são rigorosos (propriedades obrigatórias), enquanto as queries e saídas aceitam nulos, mantendo o front-end ciente da realidade do banco.
- **Atualizações (PUT vs PATCH):** Adotado PUT retornando o objeto atualizado (`200 OK`) para simplificar a manipulação de estado global do front-end.

### 2.4. Observabilidade e Logs Estruturados (Serilog)

- **Log Estruturado vs Texto:** A aplicação utiliza o Serilog como motor central. É estritamente **proibido** o uso de interpolação de strings (`$"{Variavel}"`) nos logs. Deve-se sempre utilizar Templates de Mensagem (`"Processando {DeviceName}", device.Name`) para que os agregadores (ex: Seq, Datadog) consigam indexar as variáveis.
- **Interceptação Automática:** Logs de rastreio de entrada/saída e medição de performance são aplicados globalmente a todos os Casos de Uso através do `LoggingBehavior` no pipeline do Mediator, mantendo os Handlers limpos e dedicados apenas a logs específicos de regras de negócio.
- **Telemetria Imutável:** Dados de sensores e a trilha de auditoria (`DeviceTelemetryLog`, `SystemEvent`) seguem o padrão *Append-Only* (Apenas Inserção). Não utilizamos *Soft Delete* nessas tabelas para preservar a performance de leitura no banco de dados temporal.

### 2.5. Padrão de Recuperação de Coleções (Paginação)

Para proteger a memória do servidor (OOM) e a CPU do banco de dados, o sistema **proíbe o retorno de coleções infinitas**.

- **O Contrato Genérico:** Qualquer requisição que retorne uma lista deve, obrigatoriamente, assinar a interface `IPagedQuery` (recebendo `Page` e `PageSize`) e retornar o envelope JSON padrão `PagedResult<T>`, que inclui os metadados para o front-end (`TotalPages`, `TotalCount`, etc). Buscas por ID único são a única exceção e retornam o DTO puro.
- **Segurança no EF Core:** Antes de invocar a paginação, a query no Entity Framework deve **sempre** possuir uma cláusula `.OrderBy()` explícita para garantir a estabilidade física da ordenação no SGBD.
- **Centralização:** A matemática do Offset (`Skip`/`Take`) é delegada exclusivamente ao Extension Method `.ToPagedResultAsync()`, evitando repetição de código nos Handlers.
- **Exceção deliberada:** queries de estatística agregada (ex: `GetEventHistoryStatsQuery`) não seguem `IPagedQuery` — elas somam/contam sobre todo o conjunto filtrado de propósito, e não devem ser confundidas com uma listagem paginável.

---

## 3. Padrões de Código e Convenções (C#)

### 3.1. Nomenclatura CQRS

| Tipo | Padrão | Exemplo |
|---|---|---|
| **Command** | Verbo + Substantivo + `Command` | `SetDeviceStateCommand` |
| **Query** | Verbo + Substantivo + `Query` | `GetEventHistoryQuery` |
| **Handler** | Nome exato do Command/Query + `Handler` | `GetEventHistoryQueryHandler` |

### 3.2. Organização Física

Record do Command/Query na primeira linha do arquivo; Validator e Handler logo abaixo, **no mesmo arquivo** (ex: `GetEventHistoryQuery.cs` contém o record, o validator e o handler juntos — não são três arquivos separados). Construtores primários do C# 12 para injeção de dependência.

### 3.3. Rotas RESTful

Idioma em inglês, `kebab-case`, substantivos no plural.

> Exemplos reais: `GET /api/device-groups`, `GET /api/rooms/{roomId}`, `POST /api/devices/discovery/start`

### 3.4. Nulidade, Validação e Inicialização de Objetos (NRTs)

O ecossistema utiliza **Nullable Reference Types (NRT)** habilitado. Para evitar conflitos entre a validação de domínio (FluentValidation) e as amarras do compilador, adotamos o seguinte padrão estrito:

**Entidades do EF Core — Propriedades de Navegação**
Mantemos `= null!`. Elas indicam relacionamentos que o banco de dados e o Entity Framework (via Reflection) resolvem. O uso de `required` aqui é **proibido**, pois forçaria a inicialização manual da árvore de dependências nos Handlers.

**Entidades do EF Core — Propriedades Escalares**
Para campos que compõem o estado inicial imutável do objeto puro (ex: um campo de texto crítico), é permitido o uso da palavra-chave `required` (C# 11+) para garantir a integridade logo na instanciação.

```csharp
public required string ExternalId { get; set; }
```

**DTOs e Requests de Entrada**
O uso de `required` é **proibido**. Mantemos propriedades normais ou anuláveis (`?`). A responsabilidade de barrar a ausência de dados é 100% transferida para o FluentValidation, garantindo que requisições inválidas caiam no Result Pattern e retornem um `ProblemDetails` padronizado (`422`/`400`), evitando que o Model Binding do ASP.NET aborte a requisição prematuramente com um erro genérico de framework.

**Records Posicionais (Commands e Queries)**
Utilizamos records para o transporte de dados imutáveis (CQRS). A declaração posicional na assinatura força a instanciação na ordem correta, garantindo que nenhum comando chegue ao Handler sem seu estado completo pré-definido.

---

## 4. Documentação e Qualidade de Código

### 4.1. Documentação da API (OpenAPI e Scalar)

A biblioteca Swagger/Swashbuckle foi aposentada. O projeto gera o arquivo OpenAPI nativo (.NET 10) e a interface de consumo é o **Scalar**, que oferece uma Developer Experience veloz e moderna.

### 4.2. Clean Code > Comentários

O código deve ser autoadocumentado com nomes claros. Comentários (`///`) são exclusivos para:

- Documentar **o porquê** (decisões de negócio, *workarounds* de hardware de terceiros).
- Interfaces complexas compartilhadas entre times.
- **Nunca** explicar "o que" o código está fazendo.

### 4.3. Formatação de Código

- **C#:** Formatação opinativa via `CSharpier`, instalado como dotnet tool local (`dotnet-tools.json`) — rode `dotnet tool restore` uma vez após clonar, depois `dotnet csharpier .` (ou configure "format on save" no editor).

> Git hooks automáticos (Husky.Net + lint-staged, ou equivalente) que bloqueiem commits fora do padrão **ainda não estão configurados** — hoje a formatação depende de disciplina manual/CI. Vale como próximo passo se o time crescer.

---

## 5. Organização do Workspace (Hoppscotch / Postman)

A coleção segue o ciclo de vida do recurso e cardinalidade (plural/singular):

```
📁 Smart Home Hub
│   Variáveis: {{base_url}}, {{firebase_token}}
│
└── 📁 Rooms
      GET    Get Rooms          /api/rooms
      GET    Get Room by ID     /api/rooms/{{room_id}}
      POST   Create Room        /api/rooms
      PUT    Update Room        /api/rooms/{{room_id}}
      DELETE Delete Room        /api/rooms/{{room_id}}
```