# 📡 Engenharia de Dados e Comunicação IoT

## 1. Topologia MQTT Baseada em Identidade (Padrão Industrial)
As placas de hardware publicam e escutam sem conhecer regras geográficas da casa:
* 📡 **Receber Dados (Hardware -> C#):** `home/telemetry/{deviceId}`
* ⚡ **Enviar Comandos (C# -> Hardware):** `home/commands/{deviceId}`

Mudar o dispositivo de cômodo altera apenas a coluna `RoomId` no PostgreSQL. O hardware permanece intocado.

## 2. Banco de Dados de Séries Temporais (TimescaleDB)
A tabela `DeviceTelemetryLogs` é convertida em uma *Hypertable* indexada por `{DeviceId, Timestamp}`. Configurações de escala:
* **Consultas Contínuas (Continuous Aggregates):** Pré-calcula relatórios analíticos de consumo em background.
* **Retenção e Compactação:** Compressão nativa após 30 dias e descarte automático após 1 ano para economia de disco.

## 3. Exclusão Lógica de Recursos (Soft Delete)
Nenhuma entidade principal (`User`, `Room`, `Device`, `DeviceGroup`) sofre remoção física via comando `DELETE`. 
* **Motivo:** Manter a consistência de chaves estrangeiras com os logs históricos do TimescaleDB.
* **Mecanismo:** A interface `ISoftDeletable` injeta os campos `IsDeleted` e `DeletedAt`. O `AppDbContext` intercepta deleções físicas e as converte em atualizações lógicas.
* **Filtros Globais:** O Entity Framework Core oculta automaticamente registros deletados das queries de leitura (`HasQueryFilter`). Para ver itens removidos (ex: painel de administração), deve-se usar `.IgnoreQueryFilters()`.
* **Índices Parciais:** Índices de unicidade (como o `ExternalId` dos dispositivos) utilizam o filtro nativo do Postgres `.HasFilter("\"IsDeleted\" = false")`, permitindo que um hardware reaproveitado seja cadastrado novamente sem gerar conflitos.
* **Cascatas em Memória (DDD)**: Restrições físicas de banco de dados (OnDelete Cascade ou SetNull) são proibidas. A exclusão em cascata ou desvinculação de entidades dependentes é feita manualmente em código (dentro dos Handlers) antes do disparo do Soft Delete, garantindo que o interceptador capture todas as mudanças em uma única transação.