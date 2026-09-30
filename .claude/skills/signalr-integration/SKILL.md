---
name: signalr-integration
description: Usar ao criar ou alterar comunicação realtime no Nexus Hub — Hub SignalR no backend, broadcast de telemetria/estado de dispositivo a partir de worker, grupos, autenticação do hub, ou cliente @microsoft/signalr no React (conexão, reconexão, sincronização com TanStack Query, controles throttled).
paths:
  - "backend/**/*.cs"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# SignalR — Nexus Hub

## Antes de escrever
Localizar o hub e o cliente/provider de conexão existentes. Reutilizar a conexão única; nunca criar segunda conexão.

## Backend

### Hub real: `TelemetryHub` (`SmartHomeHub.Infrastructure/Realtime/Hubs/TelemetryHub.cs`), rota `/hubs/telemetry`
Ver `backend/docs/architecture.md`, seção "SignalR / Hub", pra referência completa antes de mexer.

- **`Hub` puro, não `Hub<TClient>` tipado** — despacho pro cliente é por string via `Clients.Group(...).SendAsync("NomeDoEvento", payload)`. Ao adicionar evento novo, escolher o nome com o mesmo estilo dos existentes (`DeviceDiscovered`, `DeviceControlPreview`, `GroupControlPreview`) e conferir que o nome bate exatamente no listener do frontend (`useRealtimeListener.ts`) — não tem checagem em compilação.
- Identidade vem de `Context.User?.FindFirst("user_id")?.Value` (claim Firebase), nunca de `Context.UserIdentifier` nem de parâmetro enviado pelo cliente.
- Grupo por usuário: `$"user_{firebaseUid}"` (**underscore**, não `user:{id}`). Entrada/saída do grupo em `OnConnectedAsync`/`OnDisconnectedAsync`.
- Instância do hub é **transient**: nunca guardar estado em campo do hub — estado de discovery, coalescência etc. vive em serviço injetado (`IDeviceDiscoveryManager`), não no Hub.
- Métodos client→server que disparam comando (`PreviewDeviceBrightness`, `PreviewDeviceColor`, ...) reaproveitam o **mesmo Command** do commit REST final (ex. `SetDeviceBrightnessCommand`) — nunca criar caminho de escrita paralelo pro hardware. Falha do comando durante um preview é logada (`LogWarning`), nunca propagada como erro disruptivo — quem decide sucesso/falha real é o commit REST.

### Broadcast de fora do hub
- **Não injetar `IHubContext<TelemetryHub>` direto no worker.** O repo já tem `IRealtimeNotificationService`/`RealtimeNotificationService` (`SmartHomeHub.Infrastructure/Realtime/Services/`) encapsulando isso — Handlers/Workers chamam essa interface, nunca o `IHubContext` cru (regra "Antes de escrever" no topo desta skill: localizar e reutilizar).
- Hot path de telemetria: worker lê do `Channel` e faz broadcast via `IRealtimeNotificationService`; broadcast nunca bloqueia ingestão (falha de envio é logada, não relançada).
- Enviar para grupo (`$"user_{firebaseUid}"`), nunca `Clients.All`. Preview usa `Clients.OthersInGroup(...)` (nunca ecoa pro próprio remetente).
- Payload = objeto anônimo/DTO enxuto com o estado desejado/atual, não a entidade EF.

### Autenticação (JWT Firebase)
WebSocket não manda header `Authorization`: o token vai na query string `access_token`. Configurar no JwtBearer:
```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = ctx =>
    {
        var token = ctx.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
            ctx.Token = token;
        return Task.CompletedTask;
    }
};
```
- Não logar query string de `/hubs` (vaza token).

### Infra
- Instância única (mini PC): sem backplane Redis.
- Cloudflare Tunnel suporta WebSocket; timeout de keep-alive do SignalR deve ficar abaixo do idle timeout do túnel.

## Frontend

### Conexão única
- Uma `HubConnection` por app, criada num provider/store (não por componente/página).
- `withAutomaticReconnect()` + `accessTokenFactory` que busca token atual do Firebase (renova sozinho).
- Handlers registrados com `connection.on` e removidos com `connection.off` no cleanup do efeito.

### Sincronização com TanStack Query
- Evento realtime atualiza o cache (`queryClient.setQueryData`) — não manter estado paralelo em `useState`.
- **Ao reconectar (`onreconnected`)**: invalidar as queries de estado de dispositivo. Eventos perdidos durante a queda não voltam.
- Durante `reconnecting`: mostrar indicador de dado possivelmente desatualizado (padrão stale existente), não esconder dados.

### Controles contínuos (slider, dimmer)
- Seguir o padrão existente: espelhamento no cliente (UI responde na hora) + envio throttled + estado final sempre enviado no fim do gesto.
- Evento de volta do servidor não pode "puxar" o slider enquanto o usuário arrasta.

## Teste
- Backend: teste de integração via `WebApplicationFactory` com `HubConnectionBuilder` apontando para `factory.Server` (`HttpMessageHandlerFactory = _ => server.CreateHandler()`), provando auth e entrega ao grupo certo.
- Frontend: mockar o módulo de conexão, emitir evento e checar cache/UI; testar o caminho de reconexão (invalidação).
