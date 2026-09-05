# 🗄️ Banco de Dados e Modelagem de Dados (PostgreSQL / TimescaleDB)

## 1. Banco de Dados de Séries Temporais (TimescaleDB)

A tabela `DeviceTelemetryLogs` é convertida em uma *Hypertable* via `SELECT create_hypertable('"DeviceTelemetryLogs"', 'Timestamp')` numa migration do EF Core, indexada por `{DeviceId, Timestamp}`.

**Compressão configurada, sem retenção/descarte (decisão deliberada).** A migration `AddTelemetryCompressionPolicy` habilita `timescaledb.compress` na hypertable (`compress_segmentby = '"DeviceId"'`, `compress_orderby = '"Timestamp" DESC'`). **Não há `add_retention_policy`**: o histórico bruto é mantido indefinidamente (só comprimido, nunca descartado), pensando em uso futuro para treinamento de modelos de ML sobre o histórico completo de telemetria.

**Intervalo de compressão reduzido de 30 para 7 dias** (`ReduceTelemetryCompressionPolicyTo7Days`, `remove_compression_policy` + `add_compression_policy(..., INTERVAL '7 days')`). Motivo: sem retenção, o custo de armazenamento de chunks não comprimidos cresce linear com tempo×dispositivos×frequência de amostragem — comprimir mais cedo reduz esse custo sem apagar nenhum dado (histórico bruto continua 100% preservado, só passa a ficar armazenado em formato comprimido mais cedo) e sem afetar o dataset de ML. Só o intervalo mudou — `compress_segmentby`/`compress_orderby` e a ausência de retention permanecem intocados. Confirmado via `timescaledb_information.jobs` (`config: {"compress_after": "7 days"}`) e `timescaledb_information.chunks` (chunks com mais de 7 dias já comprimidos, `is_compressed = true`).

> ⚠️ **Atenção ao `compress_segmentby`/`compress_orderby` com colunas PascalCase**: o valor é uma string SQL interpretada separadamente — um identificador sem aspas dentro dela (`'DeviceId'`) é normalizado para lowercase (`deviceid`) e não bate com a coluna real `"DeviceId"`, falhando com `column "deviceid" does not exist`. É necessário aspas duplas *dentro* da string: `'"DeviceId"'`.

**Continuous Aggregate:** `device_telemetry_daily` (materialized view `WITH (timescaledb.continuous)`, mesma migration) pré-calcula bucket diário por `DeviceId` com `avg`/`max` de `PowerUsageWatts` e `avg` de `TemperatureCelsius`, com `add_continuous_aggregate_policy` (refresh diário, `start_offset '3 days'`, `end_offset '1 day'`). Mantém gráficos de consumo de longo prazo rápidos sem escanear a tabela bruta inteira, e serve de base pronta pra features de ML (tendência diária já pré-calculada).

---

## 2. Exclusão Lógica de Recursos (Soft Delete)

Nenhuma entidade principal (`User`, `Room`, `Device`, `DeviceGroup`) sofre remoção física via comando `DELETE` disparado pela aplicação.

- **Motivo:** Manter a consistência de chaves estrangeiras com os logs históricos do TimescaleDB e com a trilha de auditoria (`SystemEvent`).
- **Mecanismo:** A interface `ISoftDeletable` injeta os campos `IsDeleted` e `DeletedAt`. O `AppDbContext` intercepta deleções físicas disparadas pela aplicação e as converte em atualizações lógicas.
- **Filtros Globais:** O Entity Framework Core oculta automaticamente registros deletados das queries de leitura (`HasQueryFilter`). Para ver itens removidos (ex: painel de administração), deve-se usar `.IgnoreQueryFilters()`.
- **Índices Parciais:** Índices de unicidade (como o `ExternalId` dos dispositivos) utilizam o filtro nativo do Postgres — `builder.HasIndex(d => d.ExternalId).IsUnique().HasFilter("\"IsDeleted\" = false")` — permitindo que um hardware reaproveitado seja cadastrado novamente sem gerar conflito de unicidade com o registro antigo (soft-deletado).

### Comportamento real de `DeleteBehavior` no schema físico

Diferente do que uma versão anterior deste documento afirmava, o projeto **usa `DeleteBehavior` do EF Core extensivamente** no mapeamento das relações — não é proibido:

- `DeleteBehavior.Cascade` — usado exclusivamente nas relações associativas puras (ex: tabela N:N `DeviceGroup_Devices`) e credenciais de sessão/integração 1:1 (`SpotifyIntegrations`).
- `DeleteBehavior.SetNull` — usado em referências opcionais, onde o filho deve sobreviver à remoção do pai só perdendo a referência (ex: snapshots de eventos em `SystemEvents` para `DeviceId`, `RoomId`, `DeviceGroupId`, `AutomationId`).
- `DeleteBehavior.Restrict` — usado para proteger dados críticos contra exclusão física acidental via SQL: `Rooms.UserId`, `Devices.UserId`, `DeviceGroups.UserId`, `Automations.UserId`, `SystemEvents.UserId` e `DeviceTelemetryLogs.DeviceId`.

Como a aplicação nunca dispara `DELETE` físico de fato (o interceptor do `AppDbContext` converte tudo em soft delete antes de chegar ao banco), essas configurações de `DeleteBehavior` funcionam como uma segunda camada de proteção física no Postgres — bloqueando com `foreign_key_violation` qualquer tentativa indevida em migrações, scripts administrativos ou acessos externos ao banco.

### Proteção física: hard-delete de Device bloqueado por Restrict

Anteriormente, `DeviceTelemetryLog.DeviceId → Device` utilizava `DeleteBehavior.Cascade`. Embora a aplicação usasse soft-delete, qualquer script manual rodando `DELETE FROM "Devices"` fora do `AppDbContext` apagava em cascata todo o histórico de telemetria daquele dispositivo, destruindo o dataset preservado sem retenção para ML.

Com a migration `RestrictRemainingCascades`, essa relação passou a ser estritamente **`DeleteBehavior.Restrict`**:

> **Qualquer tentativa de `DELETE` físico direto em `Device` contendo telemetria associada é bloqueada pelo PostgreSQL com erro `foreign_key_violation` (código 23503).**

Isso transforma o aviso operacional anterior em uma **garantia física imposta pelo schema do banco de dados**:

- O histórico bruto de telemetria não pode ser destruído acidentalmente por um `DELETE` em `Devices`.
- Se um expurgo físico de um dispositivo for estritamente exigido (ex: conformidade legal/GDPR), o operador é obrigado a decidir e exportar/arquivar `DeviceTelemetryLogs` daquele `DeviceId` explicitamente antes de conseguir remover o registro do dispositivo no Postgres.
- A mesma política de `Restrict` é aplicada a `Automations.UserId` (protegendo regras de automação construídas pelo usuário) e `SystemEvents.UserId` (protegendo a trilha de auditoria e segurança da casa contra deleção em cascata).

---

## 3. Auditoria e Revisão dos Índices de `SystemEvents`

`SystemEvents` é uma Hypertable (chunk mensal) append-only. Manter índices desnecessários penaliza diretamente a taxa de ingestão de eventos gerados por automações e polling.

### 3.1. Remoção de índices compostos de 2 colunas redundantes
Os índices compostos de 2 colunas listados abaixo foram removidos por serem 100% redundantes perante os índices de 3 colunas já existentes (que possuem o mesmo prefixo e adicionam ordenação temporal decrescente `Timestamp DESC`):
- `IX_SystemEvents_UserId_DeviceId` (coberto por `IX_SystemEvents_UserId_DeviceId_Timestamp`)
- `IX_SystemEvents_UserId_RoomId` (coberto por `IX_SystemEvents_UserId_RoomId_Timestamp`)
- `IX_SystemEvents_UserId_DeviceGroupId` (coberto por `IX_SystemEvents_UserId_DeviceGroupId_Timestamp`)

### 3.2. Investigação dos índices monocoluna de FK
Diferente dos índices compostos, os índices monocoluna gerados pela migration `AddEventHistoryFieldsToSystemEvent` não têm `UserId` como coluna líder. Foi realizada uma auditoria dupla (código + métricas reais no banco) para decidir a retenção ou remoção:

| Índice Monocoluna | Uso no Código | Métrica Real (`idx_scan`) | Decisão | Justificativa |
|---|---|---|---|---|
| `IX_SystemEvents_AutomationId` | **SIM** | **1.182 scans** | **MANTIDO** | Essencial para subqueries em `GetAutomationsQuery` e `GetAutomationByIdQuery` (`LastExecutedAt`, `HasFailedToday`). |
| `IX_SystemEvents_DeviceId` | **SIM** | **66 scans** | **MANTIDO** | Utilizado por `GetDeviceActivityLogQuery` (`/api/devices/{id}/activity`) para varredura antes do join com `Users`. |
| `IX_SystemEvents_RoomId` | **NÃO** | **0 scans** em todos os chunks | **REMOVIDO / CANDIDATO A DROP** | Toda consulta de histórico por cômodo filtra por `UserId` e é melhor atendida pelo índice triplo `(UserId, RoomId, Timestamp DESC)`. O `EXPLAIN` confirmou que a presença de `IX_SystemEvents_RoomId` causava indecisão de custo no planejador do Postgres, gerando sort em memória no chunk 13, que é eliminado sem esse índice. |
| `IX_SystemEvents_DeviceGroupId` | **NÃO** | **0 scans** nos chunks | **REMOVIDO / CANDIDATO A DROP** | Consultas sempre passam por `UserId` e utilizam `(UserId, DeviceGroupId, Timestamp DESC)`. |

### 3.2.1. `DeviceTelemetryLogs` — remoção de índice de convenção EF redundante com o índice nativo da hypertable

Diferente da cautela aplicada em 3.2 (métrica real acumulada antes de decidir), este caso é redundância **estrutural garantida**, não dependente de acumular mais tempo de uso: `DeviceTelemetryLogs` é hypertable com PK composta `(DeviceId, Timestamp)`, e o TimescaleDB cria e mantém sozinho um índice nativo na dimensão de tempo (`DeviceTelemetryLogs_Timestamp_idx`, sem prefixo `IX_`, gerenciado pela extensão) para suportar chunk exclusion. `DeviceTelemetryLogConfiguration.cs` também configurava explicitamente `IX_DeviceTelemetryLogs_Timestamp` — índice EF monocoluna cobrindo a **mesma** coluna que o índice nativo já cobre.

Confirmado via `pg_stat_user_indexes`: `DeviceTelemetryLogs_Timestamp_idx` (nativo) tinha milhares de scans reais em múltiplos chunks; `IX_DeviceTelemetryLogs_Timestamp` (convenção EF) tinha **zero scans** em todos os chunks e na tabela mestre. Removido em `RemoveRedundantDeviceTelemetryLogsTimestampIndex` — a PK composta `(DeviceId, Timestamp)` não é afetada (`DropIndex` isolado, sem tocar em chave). Validado pós-migração via `pg_indexes`: só `DeviceTelemetryLogs_Timestamp_idx` e `PK_DeviceTelemetryLogs` restam na coluna `Timestamp`; `EXPLAIN` em queries filtradas por `Timestamp` (com e sem `DeviceId`) confirma Index Scan, sem Seq Scan.

### 3.3. Processo para revisão contínua em produção
Rodar periodicamente (a cada 30+ dias de tráfego real):

```sql
SELECT
    indexrelname AS index_name,
    idx_scan AS times_used,
    idx_tup_read AS rows_read,
    idx_tup_fetch AS rows_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname = 'SystemEvents'
ORDER BY idx_scan ASC;
```

### 3.4. Pendência explícita: índice GIN trigram para busca textual (adiado)

A primeira rodada da auditoria de banco (`backend/docs/database-audit.md`, Fase 3) propôs um índice GIN via `pg_trgm` para acelerar busca de texto livre em `SystemEvents` (campos `Description`/`DeviceName`), evitando *Seq Scan* em buscas do histórico de eventos:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "IX_SystemEvents_Search_Gin" ON "SystemEvents" USING gin ("Description" gin_trgm_ops, "DeviceName" gin_trgm_ops);
```

**Deliberadamente adiado, não implementado.** Motivo: nenhuma feature hoje expõe busca de texto livre contra `SystemEvents.Description`/`DeviceName` no produto — criar o índice agora seria custo de escrita (mais um índice pra manter em tabela append-only de alto volume) sem uso real pra justificar. Reavaliar quando/se uma feature de busca textual no histórico de eventos for implementada — junto com essa feature, não antes, e usando o mesmo processo de medição da seção 3.1–3.2 pra confirmar que o padrão de busca realmente bate com `gin_trgm_ops` (correspondência parcial/fuzzy) antes de criar.
