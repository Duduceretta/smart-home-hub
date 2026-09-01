# 📡 Engenharia de Dados e Comunicação IoT

## 1. Topologia MQTT e Comunicação com Hardware

As placas de hardware publicam telemetria sem conhecer regras geográficas da casa:

| Direção | Tópico | Observação |
|---|---|---|
| 📡 **Receber Dados** (Hardware → C#) | `home/telemetry/{deviceId}` | Assinado globalmente via `home/#` pelo `MqttListenerWorker`, que despacha `ProcessTelemetryCommand` por mensagem. |
| ⚡ **Enviar Comandos** (C# → Hardware) | `casa/comandos/{device.ExternalId}` | Só para dispositivos MQTT nativos (Sonoff/Tasmota/ESPHome) — usa `ExternalId`, não o `deviceId` interno. |

> ⚠️ **Inconsistência real no código, não só na documentação**: o tópico de telemetria está em inglês (`home/telemetry`) e o de comando em português (`casa/comandos`) — vale padronizar num só idioma na próxima limpeza técnica.

**Dispositivos Tuya não passam por MQTT para receber comandos** — usam conexão TCP/UDP direta na rede local via `ITuyaProtocolClient`, com criptografia AES-GCM (protocolo v3.4/v3.5). Google Cast/Android TV usam ADB sobre rede. O MQTT aqui serve para o padrão de hardware "genérico" (Sonoff/Tasmota/ESPHome), não como barramento único de comando pra todo tipo de dispositivo.

Mudar o dispositivo de cômodo altera apenas a coluna `RoomId` no PostgreSQL. O hardware permanece intocado — nenhuma reconfiguração de tópico é necessária.

---

## 2. Banco de Dados de Séries Temporais (TimescaleDB)

A tabela `DeviceTelemetryLogs` é convertida em uma *Hypertable* via `SELECT create_hypertable('"DeviceTelemetryLogs"', 'Timestamp')` numa migration do EF Core, indexada por `{DeviceId, Timestamp}`.

> ⚠️ **Compressão e retenção automática ainda não estão configuradas.** Não há `add_compression_policy` nem `add_retention_policy` no código hoje — a tabela cresce indefinidamente sem compactação nem descarte automático. Isso é uma lacuna real de operação, não só de documentação: à medida que o volume de telemetria cresce, vale adicionar essas políticas nativas do TimescaleDB (ex: comprimir chunks com mais de 30 dias, descartar com mais de 1 ano) antes que o tamanho do banco vire um problema.

**Continuous Aggregates:** recomendado para pré-calcular relatórios analíticos de consumo em background, reduzindo a necessidade de agregar dados brutos em tempo de consulta — consulte o estado atual da implementação diretamente no código antes de assumir que já existe, já que este documento cobre convenções, não inventário completo de infraestrutura.

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