# 📊 Engenharia de Dados e Sincronização em Tempo Real (Front-end)

Este documento define as estratégias de consumo de dados massivos, comunicação bidirecional e gestão do estado assíncrono no React. O objetivo é garantir que a interface reaja em milissegundos às mudanças do mundo físico (sensores), mantendo a estabilidade da **Main Thread** do navegador.

---

## 1. Topologia de Eventos em Tempo Real (SignalR / WebSockets)

O front-end **nunca** comunica diretamente com o broker MQTT (Mosquitto) por questões de segurança e encapsulamento. Toda a telemetria ao vivo é reencaminhada através do **Hub SignalR** da API C# (`/hubs/telemetry`), consumido por um único hook central: `src/app/hooks/useRealtimeListener.ts`.

Os métodos do hub hoje escutados são:

| Método do Hub | Ação no Estado |
|---|---|
| 🌡️ **`ReceiveTelemetryUpdate`** | Debounce de ~800ms para coalescer rajadas (um tick do worker pode disparar dezenas de eventos em poucos ms). Invalida o overview do dashboard e, de forma direcionada aos IDs recebidos na rajada, o consumo de energia do dispositivo (`devicesKeys.energy`) e o clima/energia do cômodo associado (`roomsKeys.climate`, `roomsKeys.energy`). |
| 🔌 **`DeviceStatusChanged`** | Atualiza cirurgicamente o cache de dispositivos (`setQueriesData`) e invalida o detalhe do dispositivo + overview do dashboard. |
| 🎵 **`DeviceMediaChanged`** | Atualiza o cache de mídia do dispositivo (TV/Chromecast); invalida o activity log só quando o título realmente muda. |
| 🎧 **`SpotifyPlaybackChanged`** | Atualiza o cache de playback do Spotify; mesma lógica de invalidação condicional por mudança de título/estado. |
| ⚡ **`AutomationExecutionResult`** | Invalida automações, activity log e o resumo de automações do dashboard — a execução já gravou um `SystemEvent` novo, então esses dados ficariam defasados até o próximo `staleTime` sem essa invalidação imediata. |
| 🎚️ **`DeviceControlPreview`** / **`GroupControlPreview`** | Espelhamento de arraste de slider contínuo (brilho/cor/temperatura de cor) entre clientes conectados com a mesma conta — ver seção 1.1 abaixo. |

**Invalidação Direcionada de Telemetria**: Quando uma mensagem `ReceiveTelemetryUpdate` chega, ela carrega o `deviceId` (e opcionalmente `roomId`, se presente no payload ou resolvido via cache de dispositivos). O handler agrupa os identificadores únicos afetados durante a janela de 800ms de debounce e, ao expirar o timer, invalida pontualmente apenas as queries de energia daquele dispositivo (`devicesKeys.energies(deviceId)`) e o clima/energia do seu respectivo cômodo (`roomsKeys.climate(roomId)` e `roomsKeys.energy(roomId)`), além do `dashboardKeys.overview()`. Isso garante que telas de detalhe já abertas pelo usuário atualizem instantaneamente seus gráficos sem infligir refetch em cômodos ou dispositivos alheios.

**Não há `refetchInterval`/`setInterval` em nenhuma feature hoje** — toda atualização de estado ao vivo (dispositivos, mídia, Spotify, automações) é feita exclusivamente via os eventos SignalR acima; `useDevices`/`useDeviceMedia`/`useSpotifyPlayback`/`useSpotifyStatus` usam só `staleTime` fixo + fetch no mount. Essa decisão já foi auditada e confirmada — antes de reintroduzir qualquer polling client-side (inclusive um "keep-alive" de aplicação pra detectar offline mais rápido), ver `backend/docs/iot-drivers.md`, seção 2.5: uma investigação de bancada real já mediu que push espontâneo via sessão TCP Tuya cobre mudança via app/nuvem mas **não** cobre o caso mais comum (interruptor físico), e que manter sessão persistente por dispositivo pra viabilizar isso contradiz o TTL de 60s adotado deliberadamente — recomendação registrada foi não implementar.

### 1.1. Preview em tempo real de sliders contínuos (brilho/cor/temperatura de cor)

Diferente dos demais eventos da tabela acima (que refletem estado JÁ CONFIRMADO pelo hardware), `DeviceControlPreview`/`GroupControlPreview` são eco visual de um arraste EM ANDAMENTO por outro cliente conectado com a mesma conta (ex: dois moradores com o app aberto ao mesmo tempo) — nunca disparam `invalidateQueries`, só `setQueryData` direto:

- `DeviceControlPreview` atualiza `brightness`/`colorHex`/`colorTempPercent` do dispositivo correspondente em `devicesKeys.lists()` e `devicesKeys.detail(id)` — só os campos presentes no payload (o campo sendo arrastado naquele frame; os demais ficam ausentes, não sobrescritos com `null`).
- `GroupControlPreview` atualiza `averageBrightness` do grupo correspondente em `deviceGroupsKeys.lists()`.

**Emissão (lado do cliente que está arrastando)**: `useThrottledHubInvoke` (`core/hooks/`) throttla a invocação do método do Hub (`PreviewDeviceBrightness`/`PreviewDeviceColor`/`PreviewDeviceColorTemp`/`PreviewGroupBrightness`) a ~90ms (faixa 80-100ms), sempre com o valor mais recente do frame — nunca uma fila dos intermediários. Usado em `LightControlPanel`/`ColorWheel` (individual) e `DeviceGroupMasterControl` (coletivo). Fire-and-forget: falha de invocação (conexão momentaneamente fora do ar, `Device.Busy` no backend) só é logada via `Logger.warn`, nunca interrompe o arraste nem mostra erro — o commit final via REST no `onPointerUp`/`onChangeEnd` (inalterado, `useSetDeviceBrightness`/etc.) continua sendo a única fonte de verdade sobre sucesso real.

**Complementar à coalescência de 75ms do driver Tuya** (`TuyaLightCommandCoalescer`, backend) — o throttle de ~90ms no cliente reduz o volume de invocações ANTES de chegar no backend; a coalescência do driver funde o que ainda sobra do lado do hardware. Não competem: cada um resolve a mesma rajada em um ponto diferente do pipeline.

**Atuadores discretos (toggle liga/desliga, trava, alarme) NÃO usam este padrão** — continuam confirmados só no clique/toque, sem throttle nem envio contínuo (rajada de toggle é desgaste mecânico real de relé, diferente de dimming PWM contínuo).

**Conexão compartilhada**: `useThrottledHubInvoke` invoca na MESMA conexão gerenciada por `useRealtimeListener` (única dona do ciclo de vida start/stop), obtida via `getActiveHubConnection()`/`setActiveHubConnection()` (`core/lib/signalr.ts`) — nunca abre um segundo WebSocket.

Ver `backend/docs/architecture.md`, seção "SignalR / Hub", pro racional completo do lado do servidor (reaproveitamento do mesmo Command/Handler do commit final, escopo isolado por dispositivo no caminho de grupo, tratamento de falha).

**Resiliência de Conexão:** a conexão usa `withAutomaticReconnect` com uma política customizada — o array fixo padrão do SignalR desiste de reconectar de vez após a última tentativa, o que mataria o tempo real silenciosamente pro resto da sessão numa rede instável. A política customizada nunca retorna `null`, então tenta para sempre, com backoff limitado a 30s após a 5ª tentativa:

```typescript
const connection = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
        accessTokenFactory: async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return "";
            return await currentUser.getIdToken();
        },
    })
    .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
            const delays = [0, 2000, 5000, 10000, 30000];
            return delays[Math.min(retryContext.previousRetryCount, delays.length - 1)];
        },
    })
    .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.None)
    .build();
```

Ao reconectar (`onreconnected`), eventos perdidos durante a queda **nunca são reenviados** pelo SignalR (`Clients.Group(...).SendAsync` é fire-and-forget, sem fila/replay) — por isso o handler força um refetch de todas as queries relevantes (dispositivos, mídia, overview, activity log, automações) pra reconciliar qualquer mudança ocorrida enquanto a conexão estava fora do ar.

> [!IMPORTANT]
> **Decisão Auditada — Ausência Total de Polling Contínuo no Front-end:**
> Não há `refetchInterval` nem `setInterval` em nenhuma feature hoje — decisão auditada e confirmada (auditoria Pilar 4, setembro de 2026). O front-end reage exclusivamente aos eventos do SignalR e ao refetch pontual do `onreconnected`.
> Consulte [`backend/docs/iot-drivers.md`](../../backend/docs/iot-drivers.md#25-investigação-push-espontâneo-via-sessão-tcp-local-v34v35--confirmado-só-para-mudanças-via-appnuvem-não-ocorre-para-interruptor-físico) (seção de investigação de push local) para o racional detalhado de por que push de aplicação via keep-alive contínuo de 2-5s foi avaliado e rejeitado no hardware. Esta diretriz existe para evitar a reintrodução futura de polling por desconhecimento de que isso já foi decidido conscientemente na arquitetura do produto.

---

## 2. Renderização de Séries Temporais e Alta Volumetria

O back-end utiliza o TimescaleDB para armazenar milhões de pontos. O front-end precisa de estratégias defensivas para não consumir toda a memória RAM do dispositivo do usuário ao desenhar gráficos.

### 2.1. Delegação de Agregação (Data Decimation)

O front-end **proíbe** o pedido de dados brutos para períodos superiores a 1 hora. Para gráficos diários ou mensais, a rota HTTP consumida deve obrigatoriamente apontar para os **Continuous Aggregates** do back-end (dados pré-calculados em buckets de minutos ou horas).

### 2.2. Virtualização de Listas *(recomendação futura — ainda não adotada)*

> Diferente do que uma versão anterior deste documento sugeria, `@tanstack/react-virtual` **não está instalado** no projeto hoje, e nenhuma lista usa virtualização. A tela de Histórico de Eventos (`HistoryTimeline.tsx`) lida com volume via **paginação clássica** no backend (`GetEventHistoryQuery`), não renderizando a lista inteira de uma vez.

Se algum componente futuro precisar renderizar centenas de itens simultaneamente sem paginação (ex: um modo "linha do tempo contínua"), aí sim vale adotar `@tanstack/react-virtual` para renderizar só os itens visíveis no viewport. Até lá, prefira paginação/`infinite scroll` server-side em vez de trazer grandes volumes pro cliente.

### 2.3. Otimização do Recharts

As animações nativas são **desativadas** em gráficos de telemetria em tempo real para evitar gargalos de renderização (CPU bound) durante atualizações de alta frequência:

```tsx
<LineChart data={data}>
    <Line
        type="monotone"
        dataKey="value"
        isAnimationActive={false} // obrigatório em gráficos de tempo real
    />
</LineChart>
```

---

## 3. Gestão de Exclusão Lógica (Soft Delete) e Atualizações Otimistas

Como o back-end adota Soft Delete, o front-end não pode aguardar a resposta HTTP para refletir a remoção visualmente. A responsabilidade da fluidez recai sobre a **Optimistic UI**.

**Mecanismo:** Ao enviar um comando de exclusão (ex: Remover Dispositivo) ou alteração de estado (ex: Ligar Lâmpada), o front-end assume que o back-end e o hardware vão processar o comando com sucesso.

### Fluxo de Mutação (TanStack Query)

> Use sempre a query key factory da feature (ver `architecture.md`, seção 2.2) — nunca uma chave literal como `["devices"]`, mesmo em exemplos rápidos, pra não normalizar o hábito.

```typescript
useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),

    onMutate: async (deviceId) => {
        // 1. Cancela refetches em andamento para não sobrescrever o estado otimista
        await queryClient.cancelQueries({ queryKey: devicesKeys.lists() });

        // 2. Salva o estado anterior para rollback
        const snapshot = queryClient.getQueryData(devicesKeys.lists());

        // 3. Remove o item do cache imediatamente (desaparece da tela)
        queryClient.setQueryData(devicesKeys.lists(), (old: Device[]) =>
            old.filter((d) => d.id !== deviceId)
        );

        return { snapshot };
    },

    onError: (_error, _deviceId, context) => {
        // Reverte o cache para o estado anterior
        queryClient.setQueryData(devicesKeys.lists(), context?.snapshot);
        toast.error("Falha ao remover o dispositivo. Tente novamente.");
    },

    onSettled: () => {
        // Garante sincronia final com o banco de dados real
        queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
    },
});
```

---

## 4. Estratégias de Cache e Retenção de Dados (Stale-While-Revalidate)

A arquitetura abandona o carregamento bloqueante (spinners gigantes a cada troca de tela) em favor da política **Stale-While-Revalidate** fornecida pelo TanStack Query.

| Tipo de Dado | `staleTime` | Estratégia |
|---|---|---|
| Lista de Cômodos / Topologia | `5 minutos` | Quase estático. Navegar entre telas não dispara novos pedidos HTTP. |
| Telemetria histórica (gráficos) | `30 segundos` | Revalida em background ao focar a aba. |
| Estado online/offline de devices | `0` (sempre fresco) | Gerenciado exclusivamente via SignalR, não por polling HTTP. |

**Deduplicação de Pedidos:** Se 5 widgets diferentes no Dashboard requisitarem os dados do usuário simultaneamente na montagem, o TanStack Query intercepta e envia apenas **um único pedido HTTP** ao C#, compartilhando o resultado com todos os componentes — protegendo o servidor de flooding e economizando largura de banda.

---

## 5. Contratos de Filtros e Utilitários de Hardware

### 5.1. Centralização de Filtros de Consulta

Tipagens de filtros enviados via query string para o C# devem ser centralizadas no arquivo de tipos do domínio (`features/[feature]/types/[feature].types.ts`):

```typescript
// features/devices/types/devices.types.ts
export interface DeviceFilters {
  searchTerm?: string;
  roomId?: string;
  status?: "online" | "offline";
  page?: number;
  pageSize?: number;
}
```

### 5.2. Formatadores Puros de Hardware (`core/utils/formatters.ts`)

Dados de dispositivos IoT exigem normalização estrita na camada de visualização. Além do MAC, o mesmo arquivo já centraliza a máscara de IP digitado progressivamente (`formatIpAddress`):

```typescript
export function formatMacAddress(value: string): string {
  const clean = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  const matches = clean.match(/.{1,2}/g);

  if (!matches) return "";
  return matches.slice(0, 6).join(":");
}
```