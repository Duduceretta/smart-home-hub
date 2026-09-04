using System.Security.Claims;
using System.Text.Json;
using Mediator;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;
using SmartHomeHub.Application.Features.Devices.Commands.DeleteDevice;
using SmartHomeHub.Application.Features.Rooms.Commands.CreateRoom;
using SmartHomeHub.Application.Features.Rooms.Commands.DeleteRoom;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Api.Endpoints;

public static class DevEndpoints
{
    // Marca dispositivos/ambientes criados pelo seed-mock-house, para que
    // clear-mock-house consiga identificar e remover só o que ele mesmo
    // gerou, sem tocar em dados reais do usuário.
    private const string MockExternalIdPrefix = "mock-";
    private const string MockRoomSuffix = " (Mock)";

    public static void MapDevEndpoints(this IEndpointRouteBuilder app, IWebHostEnvironment env)
    {
        if (!env.IsDevelopment())
            return;

        app.MapPost(
                "/api/dev/token",
                async (
                    [FromBody] DevTokenRequest request,
                    HttpClient httpClient,
                    IConfiguration config
                ) =>
                {
                    var firebaseApiKey = config["Firebase:WebApiKey"];

                    if (string.IsNullOrEmpty(firebaseApiKey))
                        return Results.Problem(
                            "Firebase WebApiKey não configurada no arquivo .env"
                        );

                    var response = await httpClient.PostAsJsonAsync(
                        $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebaseApiKey}",
                        new
                        {
                            email = request.Email,
                            password = request.Password,
                            returnSecureToken = true,
                        }
                    );

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorJson = await response.Content.ReadAsStringAsync();

                        return Results.Problem(
                            detail: errorJson,
                            statusCode: StatusCodes.Status400BadRequest,
                            title: "Dev.FirebaseAuthFailed",
                            type: "https://tools.ietf.org/html/rfc7231#section-6.5.1"
                        );
                    }

                    var result =
                        await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                    var idToken = result.GetProperty("idToken").GetString();

                    return Results.Text(idToken);
                }
            )
            .AllowAnonymous()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Gera um token JWT do Firebase via E-mail/Senha")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Facilita os testes no Scalar gerando o token necessário para as outras rotas. Copie o token retornado e cole no botão 'Authentication' do Scalar."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        app.MapPost(
                "/api/dev/seed-mock-house",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken ct) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var errors = new List<string>();
                    var roomIds = new List<Guid>();

                    string[] roomBlueprints = ["Sala de Estar", "Quarto", "Cozinha", "Escritório"];

                    foreach (var roomName in roomBlueprints)
                    {
                        var roomResult = await mediator.Send(
                            new CreateRoomCommand(roomName + MockRoomSuffix, "🏠", firebaseUid),
                            ct
                        );

                        if (roomResult.IsSuccess)
                            roomIds.Add(roomResult.Value);
                        else
                            errors.Add($"{roomName}: {roomResult.Error.Description}");
                    }

                    (string Name, string Brand, DeviceType Type)[] deviceBlueprints =
                    [
                        ("TV da Sala", "Samsung", DeviceType.Television),
                        ("Lâmpada da Sala", "Philips Hue", DeviceType.Light),
                        ("Lâmpada do Quarto", "Philips Hue", DeviceType.Light),
                        ("Abajur do Quarto", "Positivo", DeviceType.Light),
                        ("Tomada da Cozinha", "Intelbras", DeviceType.Switch),
                        ("Tomada do Escritório", "Intelbras", DeviceType.Switch),
                        ("Sensor de Presença", "Xiaomi", DeviceType.Sensor),
                        ("Sensor de Temperatura", "Xiaomi", DeviceType.Sensor),
                        ("Termostato da Sala", "Nest", DeviceType.Thermostat),
                        ("Fechadura da Porta", "Yale", DeviceType.Lock),
                        ("Câmera da Entrada", "Intelbras", DeviceType.Camera),
                        ("Alarme Central", "Positivo", DeviceType.Alarm),
                    ];

                    var devicesCreated = 0;

                    for (var i = 0; i < deviceBlueprints.Length; i++)
                    {
                        var (name, brand, type) = deviceBlueprints[i];
                        var roomId = roomIds.Count > 0 ? roomIds[i % roomIds.Count] : (Guid?)null;

                        var deviceResult = await mediator.Send(
                            new CreateDeviceCommand(
                                name,
                                brand,
                                $"{MockExternalIdPrefix}{type.ToString().ToLowerInvariant()}-{i}",
                                type,
                                IntegrationType.NativeMqtt,
                                roomId,
                                firebaseUid
                            ),
                            ct
                        );

                        if (deviceResult.IsSuccess)
                            devicesCreated++;
                        else
                            errors.Add($"{name}: {deviceResult.Error.Description}");
                    }

                    return Results.Ok(
                        new SeedMockHouseResponse(roomIds.Count, devicesCreated, errors)
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Gera uma casa mock com ambientes e dispositivos")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Cria de 3 a 4 ambientes e até 12 dispositivos mockados (TV, lâmpadas, tomadas, sensores, etc.) vinculados ao usuário autenticado, para testes sem hardware real."
            )
            .Produces<SeedMockHouseResponse>(StatusCodes.Status200OK);

        app.MapPost(
                "/api/dev/clear-mock-house",
                async (
                    ClaimsPrincipal userToken,
                    IAppDbContext dbContext,
                    IMediator mediator,
                    CancellationToken ct
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var user = await dbContext.Users.FirstOrDefaultAsync(
                        u => u.ExternalAuthUid == firebaseUid,
                        ct
                    );

                    if (user == null)
                        return Results.NotFound();

                    var mockDeviceIds = await dbContext
                        .Devices.Where(d =>
                            d.UserId == user.Id && d.ExternalId.StartsWith(MockExternalIdPrefix)
                        )
                        .Select(d => d.Id)
                        .ToListAsync(ct);

                    var devicesRemoved = 0;
                    foreach (var deviceId in mockDeviceIds)
                    {
                        var result = await mediator.Send(
                            new DeleteDeviceCommand(deviceId, firebaseUid),
                            ct
                        );
                        if (result.IsSuccess)
                            devicesRemoved++;
                    }

                    var mockRoomIds = await dbContext
                        .Rooms.Where(r => r.UserId == user.Id && r.Name.EndsWith(MockRoomSuffix))
                        .Select(r => r.Id)
                        .ToListAsync(ct);

                    var roomsRemoved = 0;
                    foreach (var roomId in mockRoomIds)
                    {
                        var result = await mediator.Send(
                            new DeleteRoomCommand(roomId, firebaseUid),
                            ct
                        );
                        if (result.IsSuccess)
                            roomsRemoved++;
                    }

                    return Results.Ok(new ClearMockHouseResponse(devicesRemoved, roomsRemoved));
                }
            )
            .RequireAuthorization()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Remove a casa mock gerada anteriormente")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Remove (soft delete) todos os dispositivos e ambientes criados pelo seed-mock-house, identificados pelo prefixo do ExternalId e pelo sufixo do nome do ambiente. Não afeta dispositivos/ambientes reais."
            )
            .Produces<ClearMockHouseResponse>(StatusCodes.Status200OK);

        app.MapPost(
                "/api/dev/emit-telemetry",
                async (
                    EmitTelemetryRequest request,
                    ClaimsPrincipal userToken,
                    IAppDbContext dbContext,
                    IMediator mediator,
                    CancellationToken ct
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var device = await dbContext
                        .Devices.Include(d => d.User)
                        .FirstOrDefaultAsync(d => d.Id == request.DeviceId, ct);

                    if (device == null || device.User.ExternalAuthUid != firebaseUid)
                        return Results.NotFound();

                    var topic = $"home/telemetry/{device.ExternalId}";
                    var payload = JsonSerializer.Serialize(
                        new TelemetryPayload(
                            request.IsOn,
                            request.Voltage,
                            request.SignalStrength,
                            request.PowerUsageWatts,
                            request.TemperatureCelsius
                        )
                    );

                    var result = await mediator.Send(
                        new ProcessTelemetryCommand(topic, payload),
                        ct
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { message = "Telemetria simulada emitida com sucesso." });
                }
            )
            .RequireAuthorization()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Emite telemetria simulada para um dispositivo")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Dispara a pipeline real de processamento de telemetria (persistência no TimescaleDB + notificação SignalR) para um dispositivo específico."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        app.MapPost(
                "/api/dev/toggle-connectivity",
                async (
                    ToggleConnectivityRequest request,
                    ClaimsPrincipal userToken,
                    IAppDbContext dbContext,
                    IRealtimeNotificationService notificationService,
                    CancellationToken ct
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var device = await dbContext
                        .Devices.Include(d => d.User)
                        .Include(d => d.LiveState)
                        .FirstOrDefaultAsync(d => d.Id == request.DeviceId, ct);

                    if (device == null || device.User.ExternalAuthUid != firebaseUid)
                        return Results.NotFound();

                    var liveState = device.LiveState;
                    if (liveState == null)
                    {
                        liveState = new DeviceLiveState
                        {
                            DeviceId = device.Id,
                            IsOn = device.IsOn,
                            IsOnline = device.IsOnline,
                            LastSeenAt = device.LastSeenAt,
                            Attributes = new DeviceLiveStateAttributes
                            {
                                Brightness = device.Brightness,
                                ColorHex = device.ColorHex,
                                ColorTempPercent = device.ColorTempPercent,
                            },
                        };
                        device.LiveState = liveState;
                        dbContext.DeviceLiveStates.Add(liveState);
                    }

                    device.IsOnline = request.IsOnline;
                    liveState.IsOnline = request.IsOnline;
                    if (request.IsOnline)
                    {
                        device.LastSeenAt = DateTimeOffset.UtcNow;
                        liveState.LastSeenAt = device.LastSeenAt;
                    }

                    await dbContext.SaveChangesAsync(ct);

                    await notificationService.NotifyDeviceStatusChangedAsync(
                        device.User.ExternalAuthUid,
                        device.Id,
                        liveState.IsOn,
                        liveState.IsOnline,
                        ct
                    );

                    return Results.Ok(new { message = "Conectividade do dispositivo atualizada." });
                }
            )
            .RequireAuthorization()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Força a mudança de conectividade de um dispositivo")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Altera diretamente o status IsOnline de um dispositivo e notifica via SignalR, para testar a resiliência do frontend a quedas de conexão."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost(
                "/api/dev/tuya-query-status",
                async (
                    TuyaQueryStatusRequest request,
                    ClaimsPrincipal userToken,
                    IAppDbContext dbContext,
                    ITuyaProtocolClientFactory protocolClientFactory,
                    CancellationToken ct
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var device = await dbContext
                        .Devices.Include(d => d.User)
                        .FirstOrDefaultAsync(d => d.Id == request.DeviceId, ct);

                    if (device == null || device.User.ExternalAuthUid != firebaseUid)
                        return Results.NotFound();

                    if (
                        string.IsNullOrWhiteSpace(device.Configuration.IpAddress)
                        || string.IsNullOrWhiteSpace(device.Configuration.LocalKey)
                    )
                        return Results.Problem(
                            "Dispositivo sem IP ou LocalKey configurados.",
                            statusCode: StatusCodes.Status400BadRequest
                        );

                    var protocolClient = protocolClientFactory.Resolve(
                        device.Configuration.ProtocolVersion
                    );

                    var dps = await protocolClient.QueryStatusAsync(
                        device.Configuration.IpAddress,
                        device.ExternalId,
                        device.Configuration.LocalKey,
                        ct
                    );

                    return Results.Ok(dps.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value));
                }
            )
            .RequireAuthorization()
            .WithTags("🛠️ Dev Utilities")
            .WithSummary("Consulta os Data Points brutos de um dispositivo Tuya local")
            .WithDescription(
                "🚨 **APENAS EM DESENVOLVIMENTO:** Dispara `QueryStatusAsync` direto contra o "
                    + "dispositivo Tuya real (protocolo local) e devolve o dicionário de DPs cru — "
                    + "usado só pra descoberta manual de DP/faixa de valores (ex: brilho, cor), não "
                    + "faz parte de nenhum fluxo de produção."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}

public record DevTokenRequest(string Email, string Password);

public record SeedMockHouseResponse(int RoomsCreated, int DevicesCreated, List<string> Errors);

public record ClearMockHouseResponse(int DevicesRemoved, int RoomsRemoved);

public record EmitTelemetryRequest(
    Guid DeviceId,
    bool IsOn,
    double? PowerUsageWatts,
    double? TemperatureCelsius,
    int? Voltage,
    string? SignalStrength
);

public record ToggleConnectivityRequest(Guid DeviceId, bool IsOnline);

public record TuyaQueryStatusRequest(Guid DeviceId);
