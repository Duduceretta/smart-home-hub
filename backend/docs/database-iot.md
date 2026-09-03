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

- `DeleteBehavior.Cascade` — predominante, usado nas relações onde o registro dependente não faz sentido sem o pai (ex: `DeviceTelemetryLogs` → `Device`).
- `DeleteBehavior.SetNull` — usado em referências opcionais, onde o filho deve sobreviver à remoção do pai só perdendo a referência (candidato típico: `Device.RoomId` quando um `Room` é removido).
- `DeleteBehavior.Restrict` — usado onde a exclusão do pai deve ser bloqueada enquanto existirem dependentes.

Como a aplicação nunca dispara `DELETE` físico de fato (o interceptor do `AppDbContext` converte tudo em soft delete antes de chegar ao banco), essas configurações de `DeleteBehavior` funcionam como uma segunda camada de proteção — útil em migrações, scripts administrativos ou qualquer caminho que acesse o banco fora do `AppDbContext` interceptado — mais do que como o mecanismo do dia a dia da aplicação.

Se a intenção original era mesmo proibir cascade físico e mover toda a lógica de desvinculação para os Handlers (DDD "puro"), isso ainda não é o que o schema reflete hoje — vale uma decisão consciente do time sobre qual dos dois caminhos seguir daqui pra frente, em vez de manter a documentação descrevendo uma regra que o código já não segue.

### Invariante: hard-delete de Device apaga telemetria de ML permanentemente

`DeviceTelemetryLog.DeviceId → Device` usa `DeleteBehavior.Cascade` de propósito (seção acima) — telemetria sem device não tem sentido, isso está correto. Mas isso tem uma consequência séria fora do fluxo normal da aplicação:

> **Um `DELETE` físico direto em `Device` — script de decomissionamento manual, migration de limpeza, qualquer acesso ao banco fora do `AppDbContext` interceptado — apaga em cascata TODO o histórico de telemetria daquele dispositivo, de forma permanente e irreversível.**

Isso conflita com a decisão consciente (seção 2 deste documento) de manter `DeviceTelemetryLogs` **sem retention policy**, justamente para preservar o histórico bruto completo pra treinar modelos de ML no futuro. Um hard-delete de `Device` destrói exatamente o dado que essa decisão pretendia guardar.

**Regra operacional, antes de rodar qualquer `DELETE` em `Device`:**

- Nunca use `DELETE` físico em `Device` fora do soft-delete (`IsDeleted`/`DeletedAt`) da aplicação.
- Scripts administrativos de limpeza e migrations de dados devem soft-deletar (`UPDATE ... SET "IsDeleted" = true, "DeletedAt" = now()`), nunca `DELETE FROM "Devices"`.
- Se um hard-delete real for genuinamente necessário (ex: GDPR, expurgo de dado de teste), **exporte/arquive `DeviceTelemetryLogs` daquele `DeviceId` antes** — depois do `DELETE`, o dado não existe mais em lugar nenhum.