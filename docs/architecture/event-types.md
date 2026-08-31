# 📊 Catálogo de Eventos do Sistema (SystemEvents)

Este documento formaliza as categorias de `EventType`, `EventSource` e `EventSeverity` utilizadas na persistência de auditoria e telemetria da tabela `SystemEvents`, além dos padrões de snapshot desnormalizado e formatação de mensagens.

---

## 🎯 Princípios Fundamentais

1. **Snapshots Desnormalizados Imutáveis**:
   - `DeviceName`, `RoomName` e `DeviceGroupName` são gravados como strings literais no momento da criação do evento.
   - **Proibido** resolver nomes via `JOIN` dinâmico em consultas históricas (`GetEventHistoryQuery`). Renomear, mover de cômodo ou excluir um dispositivo nunca altera retrospectivamente a trilha de auditoria de eventos passados.
2. **Tempo Absoluto (UTC)**:
   - O campo `Timestamp` é estritamente salvo em UTC (`DateTimeOffset.UtcNow`).
3. **Transição de Estados (`OldValue` / `NewValue`)**:
   - Para qualquer evento de mudança de estado (energia, volume, etc.), `OldValue` e `NewValue` devem ser explicitamente preenchidos (ex: `"off"` → `"on"`, `"online"` → `"offline"`, `"30"` → `"50"`). Deixar `null` somente quando não se aplica (ex: execuções puras ou telemetria contínua).

---

## 🏷️ Tipos de Eventos (`EventType`)

| EventType | Descrição | Exemplo de Uso | Formato de Descrição |
|---|---|---|---|
| `StateChange` | Mudança de estado operacional do dispositivo (energia, brilho, temperatura de cor, etc.) | Lâmpada ligada/desligada, tomada acionada | `"Ambiente: {RoomName}"` ou `"Estado atualizado."` |
| `AutomationTriggered` | Disparo e resultado da execução de uma regra de automação | Automação "Modo Noite" ligou as luzes | `"Ação executada em {DeviceName}."` ou `"Falha ao acionar {DeviceName}: {Erro}"` |
| `DeviceOffline` | Dispositivo perdeu conectividade de rede (timeout no probe ou falha de comunicação) | TV ou interruptor parou de responder a ping/TCP | `"Conexão perdida com o dispositivo."` |
| `DeviceOnline` | Dispositivo restabeleceu conexão de rede | Dispositivo voltou a responder a sondagens de rede | `"Ambiente: {RoomName}"` ou `"Conexão restabelecida."` |
| `MediaPlayback` | Reprodução de mídia iniciada ou alterada em streamers/TVs/áudio | Mudança de faixa no Spotify ou reprodução no Google TV | `"Tocando: {faixa} — {artista}"` |
| `Alert` | Alertas críticos, violação de limites ou alarmes de segurança | Sensor de vazamento de gás disparado | `"Alarme disparado no ambiente {RoomName}"` |
| `DeviceGroupAction` | Ação coletiva disparada sobre um grupo de dispositivos | "Todas as Luzes" desligadas via comando de grupo | `"Ação aplicada a N dispositivos no grupo {DeviceGroupName}."` |

---

## 🌐 Origens de Eventos (`EventSource`)

| Enum Value | Nome | Código | Descrição |
|---|---|---|---|
| `EventSource.Automation` | `Automation` | 1 | Disparado automaticamente pelo motor de regras/recorrência em background (`AutomationActionDispatcher`). |
| `EventSource.UserManual` | `UserManual` | 2 | Disparado por interação direta do usuário via interface web/mobile (`SetDeviceStateCommand`, etc.). |
| `EventSource.System` | `System` | 3 | Disparado por processos internos, drivers de integração, telemetria MQTT ou workers (`DeviceStatePollingWorker`, `DeviceHealthCheckWorker`, `ProcessTelemetryCommand`). |
| `EventSource.DeviceGroup` | `DeviceGroup` | 4 | Disparado através de uma ação em lote em grupo de dispositivos. |

---

## 🚦 Severidade dos Eventos (`EventSeverity`)

| Enum Value | Nome | Código | Critério de Aplicação |
|---|---|---|---|
| `EventSeverity.Info` | `Info` | 1 | Operações normais do sistema, transições de estado esperadas, reproduções de mídia e execuções bem-sucedidas. |
| `EventSeverity.Warning` | `Warning` | 2 | Eventos anômalos recuperáveis, queda de conectividade (`DeviceOffline`), alta latência ou degradação de sinal. |
| `EventSeverity.Error` | `Error` | 3 | Falhas na execução de automações, erros de comando de hardware ou falhas irrecuperáveis de drivers. |
| `EventSeverity.Critical` | `Critical` | 4 | Violações de segurança, disparos de alarmes de incêndio/gás ou falhas com potencial de dano físico. |

---

## 🎵 Decisão Técnica: Integração de Mídia (`MediaPlayback`)

Anteriormente, eventos de reprodução musical e de vídeo (como Spotify e Google TV ADB) eram registrados sob o tipo genérico `DeviceStatus` ou `Spotify`, utilizando o título cru como mensagem. 

A partir da versão 1.20+:
1. Todo evento de mídia adota o `EventType = MediaPlayback`.
2. A `Description` segue o formato unificado `"Tocando: {faixa} — {artista}"` (ou `"Tocando: {faixa}"` quando o artista for nulo/desconhecido).
3. O `Title` descreve a origem e o status operacional (ex: `"Spotify reproduzindo"`, `"Spotify pausado"`, `"Nova reprodução na TV"`).
4. `OldValue` registra o título da faixa anterior e `NewValue` o título da nova faixa, permitindo auditoria detalhada de sessões multimídia.
