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

### 5.3. Coalescência de comandos de ajuste de luz (brilho/cor/temperatura)

O semáforo por dispositivo (`SemaphoreSlim` em `TuyaLocalControlService`) resolve a corrida de dados (leitura de status obsoleta entre comandos concorrentes no mesmo device), mas sozinho ainda **serializa** — uma rajada de N comandos pro mesmo dispositivo (slider de brilho sendo arrastado, ou uma automação ajustando brilho+cor+temperatura de uma vez) continuava pagando N ciclos completos de handshake TCP sequenciais contra um microcontrolador físico que só aguenta 1-2 conexões concorrentes e precisa de tempo de recuperação entre elas.

**Mecanismo**: `SetBrightnessAsync`/`SetColorAsync`/`SetColorTempAsync` não abrem conexão na hora — cada chamada funde seu campo (brilho, cor ou temperatura) num lote pendente por `TuyaDeviceId`, mantendo só o valor **mais recente** por campo (last-value-wins: dois ajustes de brilho seguidos descartam o intermediário). A primeira chamada de um lote novo agenda um flush após uma janela curta; chamadas seguintes na mesma janela só atualizam o lote já agendado, sem agendar nada de novo. Quando a janela fecha, o lote inteiro vira **1 único** `QueryStatusAsync` + **no máximo 1** `SetDpsAsync` combinado — os campos presentes são resolvidos em ordem de chegada contra o mesmo snapshot de status (cada um vendo o efeito dos anteriores no mesmo lote), exatamente como aconteceria se cada comando tivesse executado sozinho em sequência, só que colapsado numa única escrita física.

**Janela escolhida: 75ms** (dentro da faixa 50-100ms considerada). Não há debounce/reset por atividade — é uma janela fixa a partir do primeiro comando do lote. Racional:
- 75ms de atraso adicional pro pior caso (comando isolado, sem rajada) fica bem abaixo do limiar de ~100-150ms onde lag de UI se torna perceptível — não "parece travado".
- Uma rajada de slider (eventos a cada ~20-50ms tipicamente) tem folga suficiente pra vários comandos caírem na mesma janela de 75ms e serem fundidos.

**Sem mecanismo de "flush antecipado" por inatividade — decisão deliberada, não lacuna.** Detectar "não vem mais nada" exigiria resetar o timer a cada novo campo chegando (debounce de verdade), o que troca uma janela fixa e previsível por uma lógica de cancelamento/reagendamento com suas próprias condições de corrida (novo campo chegando bem na hora que o flush ia disparar). O ganho seria economizar, no máximo, os 75ms da janela pra um comando isolado — que já está abaixo do limiar de percepção humana. Não compensa a complexidade adicional pra um benefício que ninguém percebe.

**Isolamento de falha por campo**: se um campo específico falhar na resolução de DP (`Device.NoColorDp`, cor inválida, etc.), só os callers daquele campo recebem a falha — os outros campos do mesmo lote continuam processados normalmente. Só falha de rede no `QueryStatusAsync` compartilhado ou no `SetDpsAsync` combinado afeta o lote inteiro, porque aí é uma única operação física.

**Escopo**: só `SetBrightnessAsync`/`SetColorAsync`/`SetColorTempAsync` (o cenário concreto nomeado pela auditoria). `SetPowerStateAsync`/`SetWorkModeAsync`/`GetWorkModeAsync` continuam no caminho direto (semáforo sem coalescência) — ligar/desligar e trocar de modo não são operações tipicamente disparadas em rajada como um slider contínuo.

**Achado crítico corrigido junto**: `ITuyaLocalControlService` estava registrado como `AddTransient` no DI — cada resolução (uma por requisição HTTP) criava uma instância nova, com `_deviceLocks`/`_pendingBatches` vazios. Isso significava que **nem o semáforo por dispositivo nem a coalescência tinham efeito real em produção** — cada requisição via seu próprio estado isolado, sem nunca competir ou fundir com outra. Corrigido para `AddSingleton` (dependências — `ITuyaProtocolClientFactory`, `ITuyaUdpDiscoveryScanner`, `ILogger`/`ILoggerFactory` — não guardam estado scoped, seguro capturar como singleton).

### 5.4. Circuit breaker leve para resolução de IP via broadcast UDP

Quando um comando Tuya falha por IP desatualizado (DHCP mudou o IP do dispositivo), `TryResolveIpAsync` escuta broadcast UDP (portas 6666/6667) por até `IpResolutionTimeout` (3s) tentando descobrir o novo IP antes de retentar. Se o dispositivo estiver genuinamente offline — não é problema de IP, é o dispositivo mesmo fora do ar — esse broadcast se repetia a cada tentativa de comando, adicionando ~3s de espera desnecessária em toda chamada, sempre sem sucesso.

**Mecanismo**: `ConcurrentDictionary<string, DateTime>` por `TuyaDeviceId` (`_ipResolutionCircuitBreakerOpenUntil`), separado do `_deviceLocks` do semáforo — mecanismo independente, não compete nem substitui a serialização/coalescência já existente. Uma falha de resolução (broadcast não encontrou o dispositivo) grava `DateTime.UtcNow + janela` pra aquele device; enquanto `DateTime.UtcNow < openUntil`, qualquer chamada seguinte a `TryResolveIpAsync` pro MESMO device retorna `null` imediatamente (sem broadcast), fazendo o caller falhar rápido com `Device.Offline`. Uma resolução bem-sucedida a qualquer momento remove a entrada do dicionário na hora (`TryRemove`), não espera a janela expirar.

**Janela escolhida: 10s.** Racional:
- Longa o suficiente pra realmente evitar a repetição redundante do caso comum (usuário/automação tentando o mesmo comando várias vezes seguidas contra um dispositivo desligado da tomada).
- Curta o suficiente pra não mascarar por muito tempo um dispositivo que voltou a ficar alcançável (reconectou à rede, tomada religada) — 10s é bem menor que o intervalo de polling do `DeviceHealthCheckWorker` (~12s), então o próximo ciclo de verificação de saúde já teria uma chance de broadcast livre de qualquer forma.

**Seam de teste**: construtor aceita `ipResolutionCircuitBreakerWindowForTests` (mesmo padrão dos outros seams do driver — `semaphoreAcquireTimeoutForTests`, `coalescingWindowForTests`), produção usa o default de 10s.

### 5.5. Investigação: push espontâneo via sessão TCP local (v3.4/v3.5) — confirmado só para mudanças via app/nuvem, NÃO ocorre para interruptor físico

**Pergunta original**: com uma sessão TCP autenticada (handshake de 3 vias completo, session key derivada) mantida **aberta** em vez de fechada após o comando, o dispositivo empurra sozinho um frame de status quando o estado muda por fora (interruptor físico, app SmartLife) — sem nenhum polling nosso? Esse é o mecanismo que bibliotecas do ecossistema Tuya-local (localtuya, tinytuya) usam pra atualização "quase instantânea" sem depender da nuvem Tuya. Diferente da via já descartada (broadcast UDP nas portas 6666/6667 não carrega `dps` — payload idêntico entre estados on/off, confirmado empiricamente; não repetir esse teste).

**Ferramenta**: `backend/tools/bench/TuyaSpontaneousPushBench` (protocolo de uso em `backend/tools/bench/README.md`) — console app isolado fora de `SmartHomeHub.slnx`, reaproveita handshake/derivação de session key de `TuyaSessionProtocolClient`, mantém o socket aberto após o handshake e entra em escuta passiva.

**Resultado 1 — mudança via app SmartLife: SIM, gera push espontâneo.** Rodada real contra dispositivo v3.5 de bancada, sessão aberta, sem nenhum comando nosso além da query de baseline inicial. Dois frames não solicitados chegaram no socket durante a janela de escuta passiva, cada um coincidindo com uma mudança de estado feita pelo app:

```
[23:34:27.066] *** FRAME ESPONTÂNEO #1 (t=3.928s desde o início da sessão) ***
  -> JSON decodificado (offset 19): {"protocol":4,"t":1788575636,"data":{"dps":{"20":false}}}
[23:34:38.333] *** FRAME ESPONTÂNEO #2 (t=15.195s desde o início da sessão) ***
  -> JSON decodificado (offset 19): {"protocol":4,"t":1788575648,"data":{"dps":{"20":true}}}
```

**Formato do frame de push**: `cmd=8` (não `0x0D`/`CmdControlNew` usado pelas nossas escritas, nem `0x10`/`CmdDpQueryNew` das nossas leituras — é um comando próprio de notificação), payload com prefixo de 19 bytes (versão + campos internos, mesmo padrão observado nas respostas a comando) seguido de JSON `{"protocol":4,"t":<unix>,"data":{"dps":{...}}}` — layout "protocol 4", diferente do "protocol 5" usado no nosso `SetDpsAsync` (`{"protocol":5,"t":...,"data":{"dps":{...}}}`). `dps` vem decodificável e com o valor correto do novo estado nos dois frames observados.

**Latência**: não medida com precisão — o horário exato do toque no app não foi registrado com relógio sincronizado ao do script. Qualitativamente, os frames chegaram sem delay perceptível de segundos (não foi preciso esperar um ciclo de polling). Uma rodada futura com relógios sincronizados mediria latência exata em milissegundos, se isso vier a importar pra decisão final.

**Resultado 2 — interruptor físico: NÃO gera push espontâneo (confirmado, evidência limpa).** Segunda rodada, mesma metodologia, dispositivo v3.5: interruptor físico acionado **dentro** da janela de escuta passiva, com confirmação visual de que o dispositivo mudou de estado fisicamente (luz mudou). **Nenhum frame chegou no socket durante os 90s inteiros da janela**, e a sessão nem sequer caiu (ver Resultado 3). Diferente da tentativa anterior (rodada sem log, cronometragem incerta), esta rodada tem log completo e confirmação de que a ação física de fato ocorreu dentro da janela monitorada — a ausência de frame aqui não é dúvida metodológica, é o resultado. **Esse é o achado mais importante pra decisão de arquitetura**: o cenário motivador original da investigação (mudança "por fora", sem passar pelo app/nuvem) é justamente o que NÃO é coberto por push local nesse hardware/firmware.

**Resultado 3 — comportamento da sessão ociosa: revisto, não é um timeout fixo de ~15s.** A primeira rodada (Resultado 1) tinha registrado a sessão caindo ~15.2s após o último frame de push; documentamos isso inicialmente como "timeout de inatividade do dispositivo". **Essa conclusão está incorreta** — a segunda rodada (interruptor físico, zero tráfego de qualquer tipo depois da query de baseline) manteve a sessão aberta pelos 90s inteiros sem cair. Ou seja, ociosidade pura NÃO derruba a sessão dentro dessa janela. A hipótese mais consistente com as duas rodadas é que a queda da primeira rodada esteve correlacionada com a própria mudança via app/nuvem (o dispositivo pode reiniciar seu listener TCP local logo após processar um comando vindo do lado cloud, por exemplo), não com tempo de inatividade do socket. **Isso não está confirmado com certeza** — é uma hipótese com n=1 evento de queda observado; precisaria de mais rodadas (múltiplas mudanças via app na mesma sessão, observando se cada uma correlaciona com uma queda subsequente) pra virar conclusão sólida.

**Recomendação**: 
1. **Push puro não serve como substituto do polling** — o caso mais comum e mais citado como motivador (interruptor físico) não é coberto. Qualquer arquitetura de sync tem que manter o polling do `DeviceHealthCheckWorker` como caminho principal de qualquer forma, não como "rede de segurança" secundária.
2. Push via app/nuvem É real e poderia reduzir latência **só** para esse subconjunto de mudanças (ex: usuário mudou pelo SmartLife enquanto o hub também está com sessão aberta) — mas o ganho prático é questionável: se o usuário já mudou pelo app, o próprio app/nuvem Tuya já refletiu a mudança; o hub só ganharia velocidade de refletir isso na UI própria antes do próximo ciclo de polling (~12s), não uma capacidade nova.
3. Dado (1) e (2), **o custo de manter uma sessão TCP persistente por dispositivo Tuya** (gerenciamento de reconexão, uma sessão a mais por device rodando indefinidamente, possível reinício de sessão após comandos via app conforme Resultado 3) **não parece compensar** o ganho — que é só latência de UI pra um subconjunto de mudanças que o polling de 12s já cobre com atraso pequeno. **Não recomendado implementar em produção com a evidência atual.**
4. Se o interesse for reduzir a latência do caso comum (interruptor físico), a via correta continua sendo reduzir o intervalo de polling do `DeviceHealthCheckWorker` ou investigar se o dispositivo aceita ser configurado para reportar por outro canal (ex: LWT MQTT, se o firmware suportar — não é o caso do hardware Tuya nativo, que não fala MQTT, ver seção 1) — não a sessão TCP persistente.

---

## 6. Resiliência MQTT — LWT individual, sessão persistente, NoDelay

### 6.1. LWT individual de dispositivos MQTT nativos (Tasmota/ESPHome)

Diferente do LWT do próprio backend (seção 2, `home/status/backend`, avisa quando o BACKEND cai), firmwares Tasmota/ESPHome podem publicar seu próprio LWT individual sozinhos, sinalizando a queda do DISPOSITIVO — detectável quase instantaneamente pelo broker, sem esperar o polling do `DeviceHealthCheckWorker` (~12s).

**Convenção de tópico: `home/status/{externalId}`** — mesmo esquema já documentado na seção 1 (`home/telemetry/{externalId}`, `home/commands/{externalId}`), não o default de fábrica do Tasmota (`tele/%topic%/LWT`). **Nenhum hardware real estava provisionado no momento desta implementação** — só simulação via `MockTelemetryWorker`. Quando dispositivos Tasmota/ESPHome reais forem configurados, o FullTopic/config MQTT do firmware precisa publicar o LWT individual (payload texto puro `"Online"`/`"Offline"`, comparação case-insensitive) nesse tópico especificamente pra este caminho funcionar — sem isso, a detecção volta a depender só do polling.

**Sem subscription adicional**: `home/#` (já assinado, QoS 1) cobre `home/status/{externalId}` — o roteamento acontece só no handler de mensagem recebida (`ApplicationMessageReceivedAsync`), que despacha `ProcessDeviceLwtCommand` pra tópicos `home/status/*` e `ProcessTelemetryCommand` pros demais.

**Lógica de "marcar offline/online" reutilizada, não duplicada**: `DeviceConnectivityUpdater.ApplyConnectivityChange` (Application/Common/Devices) é chamado tanto pelo `DeviceHealthCheckWorker` (polling — rede de segurança, continua rodando sem mudança) quanto pelo `ProcessDeviceLwtCommand` (LWT — caminho adicional, mais rápido). Idempotente: repetir o mesmo sinal (LWT duplicado, ou já sincronizado por telemetria recente) não gera `SystemEvent` nem notificação SignalR duplicados.

### 6.2. Sessão MQTT persistente

`WithCleanStart(false)` + `WithSessionExpiryInterval(300)` (5 minutos) — o `ClientId` já era fixo (`"SmartHomeHub_Backend"`, nunca gerado por conexão), pré-requisito pra sessão persistente funcionar (o broker só reconhece "é o mesmo cliente de antes" se o ClientId bater). Em MQTT v5 (protocolo default do MQTTnet aqui), `CleanStart(false)` sozinho não basta — sem `SessionExpiryInterval > 0` o broker usa 0 e descarta a sessão no disconnect de qualquer forma. 300s cobre uma reconexão breve (restart da API, blip de rede) sem manter estado indefinidamente.

Resubscrição em `home/#` no `ConnectedAsync` **não precisou mudar** — continua incondicional em toda conexão. Isso é seguro nos dois cenários: se o Mosquitto reconheceu a sessão e restaurou a subscription sozinho, o `SUBSCRIBE` enviado vira um no-op idempotente (MQTT não duplica entrega por resubscrever no mesmo tópico/QoS); se a sessão expirou ou é a primeira conexão, o `SUBSCRIBE` é necessário e acontece normalmente. Testado (`ConfigureEvents_AfterBriefReconnect_ShouldStillResubscribeToWildcardTopic`) simulando duas conexões seguidas.

### 6.3. NoDelay (Nagle desligado)

**Driver Tuya** (`TuyaSessionProtocolClient`): `tcpClient.NoDelay = true` logo após criar o `TcpClient`. Ganho real aqui — protocolo é request-response síncrono com pacotes pequenos (handshake + comando, dezenas a centenas de bytes); Nagle ligado atrasaria o envio esperando acumular mais dados ou o ACK anterior, até ~40ms de latência extra por escrita, sem nenhum benefício de throughput pra esse padrão de tráfego.

**Cliente MQTT**: também aplicado (`MqttClientTcpOptions.NoDelay`, mutado depois do `.Build()` — a sobrecarga `WithTcpServer(Action<MqttClientTcpOptions>)` exigiria montar `RemoteEndpoint` manualmente e falhou em runtime numa tentativa anterior com `ArgumentException: No endpoint is set.`; mutar `ChannelOptions` após o `Build()` evita mexer na resolução de host/porta já testada da sobrecarga simples). Ganho menor aqui do que no Tuya — o canal MQTT já é de longa duração, não comando síncrono isolado — mas sem custo pra aplicar já que a opção existe pronta na lib.

### 6.4. Desligamento gracioso do supervisor de conexão

O loop de supervisão (`MaintainConnectionAsync`, retry de conexão + resubscrição em `home/#`) era disparado em `StartAsync` via `_ = Task.Run(...)` fire-and-forget — sem guardar a `Task` nem vincular ao ciclo de vida do `MqttListenerWorker`. Não existia um `StopAsync` que esperasse o supervisor terminar de fato: ao desligar a API, o processo podia morrer com o supervisor no meio de uma tentativa de reconexão, sem nunca chamar `DisconnectAsync()` de forma limpa — o que significava que o LWT do backend (`home/status/backend`, retain: true) nunca era limpo/atualizado corretamente no broker antes do encerramento normal do processo (só o Will disparava, comportamento de crash, não de shutdown ordenado).

**Mecanismo**: `StartAsync` agora guarda a `Task` retornada por `Task.Run(MaintainConnectionAsync)` em `_maintainConnectionTask`, rodando sob um `CancellationTokenSource` interno (`_stoppingCts`, linkado ao token recebido) — não o token original diretamente, porque `StopAsync` precisa poder sinalizar esse loop mesmo que o host ainda não tenha cancelado seu próprio token. `IMqttService.StopAsync` (novo método na interface) cancela `_stoppingCts`, espera `_maintainConnectionTask` com um timeout curto, e então chama `_client.DisconnectAsync()` explicitamente — sinalizando ao broker uma desconexão limpa (DISCONNECT) em vez de deixar o Will disparar. `MqttListenerWorker` sobrescreve `StopAsync(CancellationToken)` (do `BackgroundService`) pra chamar `mqttService.StopAsync(CancellationToken.None)` antes do `base.StopAsync` — `CancellationToken.None` porque esse shutdown precisa rodar mesmo que o token de shutdown do host já esteja cancelado nesse ponto; o timeout próprio do `MqttService` é quem evita travar o processo indefinidamente.

**Timeout escolhido: 5s.** Folga generosa sobre o tempo normal de uma iteração do loop (ping/connect + o `Task.Delay` de retry de 5s), sem arriscar travar o shutdown do processo indefinidamente caso o supervisor nunca observe o cancelamento por algum motivo inesperado (ex: preso numa chamada de rede sem `CancellationToken` interno). Se o timeout estourar, loga `Warning` e prossegue com o shutdown de qualquer forma — não trava a aplicação por causa de um supervisor pendurado.

**Exceções continuam logadas**: `RunSupervisedAsync` já captura e loga (nível `Critical`) qualquer exceção não prevista dentro de `MaintainConnectionAsync` internamente, antes de decidir reiniciar o loop ou sair (quando `OperationCanceledException` bate com o cancelamento em andamento). Isso significa que `_maintainConnectionTask` nunca completa com uma exceção não observada — o `await` em `StopAsync` não corre risco de "engolir" um erro que não tivesse sido logado antes.