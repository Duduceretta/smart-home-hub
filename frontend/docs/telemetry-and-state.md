# 📊 Engenharia de Dados e Sincronização em Tempo Real (Front-end)

Este documento define as estratégias de consumo de dados massivos, comunicação bidirecional e gestão do estado assíncrono no React. O objetivo é garantir que a interface reaja em milissegundos às mudanças do mundo físico (sensores), mantendo a estabilidade da **Main Thread** do navegador.

---

## 1. Topologia de Eventos em Tempo Real (SignalR / WebSockets)

O front-end **nunca** comunica diretamente com o broker MQTT (Mosquitto) por questões de segurança e encapsulamento. Toda a telemetria ao vivo é reencaminhada através do **Hub SignalR** da API C#.

A subscrição de eventos segue uma topologia baseada na hierarquia do domínio:

| Contexto / Hub | Tópico de Escuta | Ação no Estado |
|---|---|---|
| 🌡️ **Telemetria** | `ReceiveTelemetryUpdate` | Atualiza cirurgicamente a query em cache do gráfico do dispositivo (sem refetch HTTP). |
| 🔌 **Estado (Online/Offline)** | `DeviceStatusChanged` | Atualiza o estado global de conexão e aciona Toasts de alerta em caso de falha física. |
| 🏠 **Topologia da Casa** | `RoomTopologyChanged` | Invalida o cache global de `["dashboard", "rooms"]`, forçando o TanStack Query a fazer um refetch em background. |

**Resiliência de Conexão:** A instância do SignalR deve ser configurada com `withAutomaticReconnect()`. Em caso de quebra temporária de internet, o front-end tenta reconectar de forma silenciosa com intervalos exponenciais (0, 2, 10, 30 segundos).

```typescript
const connection = new HubConnectionBuilder()
    .withUrl("/hubs/telemetry", { accessTokenFactory: () => getFirebaseToken() })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();
```

---

## 2. Renderização de Séries Temporais e Alta Volumetria

O back-end utiliza o TimescaleDB para armazenar milhões de pontos. O front-end precisa de estratégias defensivas para não consumir toda a memória RAM do dispositivo do usuário ao desenhar gráficos.

### 2.1. Delegação de Agregação (Data Decimation)

O front-end **proíbe** o pedido de dados brutos para períodos superiores a 1 hora. Para gráficos diários ou mensais, a rota HTTP consumida deve obrigatoriamente apontar para os **Continuous Aggregates** do back-end (dados pré-calculados em buckets de minutos ou horas).

### 2.2. Virtualização de Listas

Qualquer componente que exiba histórico de eventos (ex: `RecentActivities`) com mais de 50 itens deve utilizar virtualização via `@tanstack/react-virtual`. Apenas os itens visíveis no viewport são renderizados no DOM.

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

```typescript
useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),

    onMutate: async (deviceId) => {
        // 1. Cancela refetches em andamento para não sobrescrever o estado otimista
        await queryClient.cancelQueries({ queryKey: ["devices"] });

        // 2. Salva o estado anterior para rollback
        const snapshot = queryClient.getQueryData(["devices"]);

        // 3. Remove o item do cache imediatamente (desaparece da tela)
        queryClient.setQueryData(["devices"], (old: Device[]) =>
            old.filter((d) => d.id !== deviceId)
        );

        return { snapshot };
    },

    onError: (_error, _deviceId, context) => {
        // Reverte o cache para o estado anterior
        queryClient.setQueryData(["devices"], context?.snapshot);
        toast.error("Falha ao remover o dispositivo. Tente novamente.");
    },

    onSettled: () => {
        // Garante sincronia final com o banco de dados real
        queryClient.invalidateQueries({ queryKey: ["devices"] });
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