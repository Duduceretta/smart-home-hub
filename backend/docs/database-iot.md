# 📡 Engenharia de Dados e Comunicação IoT

## 1. Topologia MQTT e Comunicação com Hardware

As placas de hardware publicam telemetria sem conhecer regras geográficas da casa:

| Direção | Tópico | Observação |
|---|---|---|
| 📡 **Receber Dados** (Hardware → C#) | `home/telemetry/{externalId}` | Assinado globalmente via `home/#` pelo `MqttListenerWorker`, que despacha `ProcessTelemetryCommand` por mensagem. |
| ⚡ **Enviar Comandos** (C# → Hardware) | `home/commands/{externalId}` | Só para dispositivos MQTT nativos (Sonoff/Tasmota/ESPHome) — usa `ExternalId`, não o `deviceId` interno. |

`{externalId}` é o `Device.ExternalId` (identificador físico do hardware, ex: MAC address) nos dois tópicos — é a única forma do hardware se identificar antes de estar cadastrado no banco (`deviceId` interno só existe depois do cadastro). Os dois tópicos vivem sob o mesmo namespace `home/` em inglês, sem mais a inconsistência de idioma que existia antes entre `home/telemetry` e `casa/comandos`.

**Dispositivos Tuya não passam por MQTT para receber comandos** — usam conexão TCP/UDP direta na rede local via `ITuyaProtocolClient`, com criptografia AES-GCM (protocolo v3.4/v3.5). Google Cast/Android TV usam ADB sobre rede. O MQTT aqui serve para o padrão de hardware "genérico" (Sonoff/Tasmota/ESPHome), não como barramento único de comando pra todo tipo de dispositivo.

Mudar o dispositivo de cômodo altera apenas a coluna `RoomId` no PostgreSQL. O hardware permanece intocado — nenhuma reconfiguração de tópico é necessária.

---

## 2. Banco de Dados de Séries Temporais (TimescaleDB)

A tabela `DeviceTelemetryLogs` é convertida em uma *Hypertable* via `SELECT create_hypertable('"DeviceTelemetryLogs"', 'Timestamp')` numa migration do EF Core, indexada por `{DeviceId, Timestamp}`.

**Compressão configurada, sem retenção/descarte (decisão deliberada).** A migration `AddTelemetryCompressionPolicy` habilita `timescaledb.compress` na hypertable (`compress_segmentby = '"DeviceId"'`, `compress_orderby = '"Timestamp" DESC'`) com `add_compression_policy(..., INTERVAL '30 days')` — chunks com mais de 30 dias são comprimidos automaticamente. **Não há `add_retention_policy`**: o histórico bruto é mantido indefinidamente (só comprimido, nunca descartado), pensando em uso futuro para treinamento de modelos de ML sobre o histórico completo de telemetria.

> ⚠️ **Atenção ao `compress_segmentby`/`compress_orderby` com colunas PascalCase**: o valor é uma string SQL interpretada separadamente — um identificador sem aspas dentro dela (`'DeviceId'`) é normalizado para lowercase (`deviceid`) e não bate com a coluna real `"DeviceId"`, falhando com `column "deviceid" does not exist`. É necessário aspas duplas *dentro* da string: `'"DeviceId"'`.

**Continuous Aggregate:** `device_telemetry_daily` (materialized view `WITH (timescaledb.continuous)`, mesma migration) pré-calcula bucket diário por `DeviceId` com `avg`/`max` de `PowerUsageWatts` e `avg` de `TemperatureCelsius`, com `add_continuous_aggregate_policy` (refresh diário, `start_offset '3 days'`, `end_offset '1 day'`). Mantém gráficos de consumo de longo prazo rápidos sem escanear a tabela bruta inteira, e serve de base pronta pra features de ML (tendência diária já pré-calculada).

---

## 3. Exclusão Lógica de Recursos (Soft Delete)

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

## 4. Processo Futuro: Revisão dos Índices de `SystemEvents`

`SystemEvents` tem 6 índices compostos hoje, todos liderados por `UserId`: `(UserId, Timestamp DESC)`, `(UserId, DeviceId)`, `(UserId, RoomId)`, `(UserId, DeviceGroupId)`, `(UserId, Severity)`, `(UserId, Source)`. A auditoria de banco levantou uma hipótese de consolidação, mas **não deve ser aplicada às cegas** — precisa de dado real de uso primeiro. Esta seção documenta o processo, não uma ação a executar agora.

### 4.1. Quando revisar

Rodar essa análise só depois de um período mínimo de **30 dias de uso contínuo em produção** — período curto demais não deixa o padrão de acesso real emergir (ex: um índice pode parecer "não usado" só porque ninguém abriu aquele filtro específico do dashboard na semana em que foi medido).

### 4.2. Query de diagnóstico

Rodar contra o banco de produção (não contra dev/staging, que não reflete tráfego real):

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

- `idx_scan` baixo ou zero após 30+ dias de tráfego real = candidato a remoção — o índice está custando escrita (todo `INSERT` em `SystemEvents`, tabela append-only de alto volume, atualiza os 6 índices) sem retorno de leitura proporcional.
- Cruzar com `pg_stat_user_indexes.relname` pra garantir que está olhando os índices da tabela certa, não de alguma hypertable-chunk interna com nome parecido.

### 4.3. Plano condicional (só depois da medição acima)

Se a medição confirmar a hipótese da auditoria (índices por `RoomId`/`DeviceGroupId`/`Source`, por exemplo, raramente usados), a consolidação proposta é:

- Manter `(UserId, Timestamp DESC)` como índice composto principal — cobre o caminho de acesso mais comum (histórico ordenado por tempo, filtrado por usuário).
- Trocar os índices de baixo uso por índices **parciais** nos filtros que a medição confirmar como efetivamente quentes — ex: `CREATE INDEX ... ON "SystemEvents" (UserId, Timestamp DESC) WHERE "Severity" = 'Alert'` pro dashboard de alertas, em vez de manter um índice composto genérico por `Severity` cobrindo todos os valores.
- Objetivo: reduzir o custo de escrita (menos índices pra manter a cada `INSERT`) sem perder a velocidade de leitura nos filtros que o produto realmente usa.

Esse plano só deve ser executado com os números da query acima em mãos — não como ação desta tarefa.

### 4.4. Pendência explícita: índice GIN trigram para busca textual (adiado)

A primeira rodada da auditoria de banco (`backend/docs/database-audit.md`, Fase 3) propôs um índice GIN via `pg_trgm` para acelerar busca de texto livre em `SystemEvents` (campos `Description`/`DeviceName`), evitando *Seq Scan* em buscas do histórico de eventos:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "IX_SystemEvents_Search_Gin" ON "SystemEvents" USING gin ("Description" gin_trgm_ops, "DeviceName" gin_trgm_ops);
```

**Deliberadamente adiado, não implementado.** Motivo: nenhuma feature hoje expõe busca de texto livre contra `SystemEvents.Description`/`DeviceName` no produto — criar o índice agora seria custo de escrita (mais um índice pra manter em tabela append-only de alto volume) sem uso real pra justificar. Reavaliar quando/se uma feature de busca textual no histórico de eventos for implementada — junto com essa feature, não antes, e usando o mesmo processo de medição da seção 4.1–4.2 pra confirmar que o padrão de busca realmente bate com `gin_trgm_ops` (correspondência parcial/fuzzy) antes de criar.

---

## 5. Driver Local Tuya (TCP)

### 5.1. Resolução de versão de protocolo — v3.1/3.2/3.3 convergem sem branch dedicado

`TuyaProtocolClientFactory.Resolve()` só tem branches explícitos para `"3.4"` e `"3.5"` (`TuyaSessionProtocolClient`, sessão própria com HMAC-SHA256+AES-ECB ou AES-GCM). Qualquer outra coisa — `null`, `"3.1"`, `"3.2"`, `"3.3"` — cai no mesmo `TuyaNetProtocolClient` (biblioteca terceira `com.clusterrr.TuyaNet`), que internamente sempre usa `TuyaProtocolVersion.V33` fixo, mesmo quando o dispositivo real fala v3.1.

Isso é intencional, não uma lacuna: v3.1/v3.2/v3.3 compartilham o mesmo esquema de criptografia (AES-128-ECB, sem sessão/HMAC/GCM) e o mesmo formato de frame — não existe diferença de protocolo entre eles que justifique um branch próprio. Um dispositivo v3.1 real funciona corretamente sendo tratado como v3.3 porque, nesse range, a diferença de versão é só cosmética do lado do app oficial Tuya, não do wire protocol. Manutenção futura da factory não deve interpretar essa ausência de branch como bug a corrigir — só criar um branch dedicado se algum dispositivo real nesse range exigir tratamento distinto (o que não foi observado até hoje).

### 5.2. Trade-off aceito: handshake TCP duplicado por comando

O driver não mantém conexão persistente — cada operação pública (`SetBrightnessAsync`, `SetColorAsync`, `SetPowerStateAsync`, etc.) abre uma conexão TCP nova tanto para o `QueryStatusAsync` (lê o estado atual pra decidir o que escrever) quanto para o `SetDpsAsync` (escreve o comando) — **2 handshakes TCP completos por comando de usuário único**, sempre.

É decisão arquitetural deliberada: "conexão nova por comando" é muito mais simples de raciocinar e testar do que gerenciar um pool de conexões persistentes por dispositivo (que exigiria lidar com timeout de sessão, invalidação de conexão, reconexão em background, etc.). O custo é real, mas hoje é imperceptível no volume típico (poucos comandos por minuto, poucos dispositivos Tuya por instalação).

**Condição explícita para revisitar**: se o número de dispositivos Tuya por instalação crescer o suficiente para tornar o custo de handshake duplicado mensurável — especialmente se polling periódico de estado for implementado (ver auditoria de drivers IoT sobre prontidão para polling/push), o que multiplicaria o número de handshakes por unidade de tempo — avaliar pooling de conexão ou keep-alive **nesse momento**, não antes. Otimizar isso hoje seria resolver um problema de performance que não existe ainda, à custa de complexidade real de gerenciamento de conexão.