using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Dashboards.Queries.GetDashboardOverview;

public record DashboardSummaryDto(
    int TotalDevicesCount,
    int OnlineDevicesCount,
    double EnergyConsumptionKwh,
    bool IsEnergyEstimated,
    double AverageTemperatureCelsius,
    double TemperatureTrend,
    int ActiveAlertsCount
);

/// <summary>
/// Value é potência média (kW) do balde de tempo — não energia. O gráfico
/// mostra "quanto a casa está puxando agora", distinto do total acumulado
/// do dia (DashboardSummaryDto.EnergyConsumptionKwh, em kWh).
/// IsEstimated é true se algum dispositivo do balde não tem sensor de
/// energia real (ex: TV via ADB/Cast) e entrou com potência estimada —
/// o valor não deixa de ser útil, só não é 100% medido.
/// </summary>
public record EnergyChartPointDto(DateTimeOffset Timestamp, double Value, bool IsEstimated);

/// <summary>
/// RoomId nulo representa o bucket "Sem Ambiente" (dispositivos sem cômodo
/// atribuído) — casar por Id em vez de nome evita depender do texto exibido
/// na tela, que é traduzido/pode mudar. IsEstimated segue o mesmo critério
/// de EnergyChartPointDto.
/// </summary>
public record RoomEnergyUsageDto(Guid? RoomId, double Value, bool IsEstimated);

public record RecentEventDto(
    Guid Id,
    DateTimeOffset Timestamp,
    string Title,
    string Description,
    string EventType
);

public record DashboardOverviewResponse(
    DashboardSummaryDto Summary,
    List<EnergyChartPointDto> EnergyChart,
    List<RoomEnergyUsageDto> RoomUsage,
    List<RecentEventDto> RecentActivities
);

public record GetDashboardOverviewQuery(string FirebaseUid, DateTimeOffset TargetDateUtc)
    : IQuery<Result<DashboardOverviewResponse>>;

public sealed class GetDashboardOverviewQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDashboardOverviewQuery, Result<DashboardOverviewResponse>>
{
    public async ValueTask<Result<DashboardOverviewResponse>> Handle(
        GetDashboardOverviewQuery request,
        CancellationToken cancellationToken
    )
    {
        var userDevices = await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.User.ExternalAuthUid == request.FirebaseUid && !device.IsDeleted
            )
            .Select(device => new
            {
                device.Id,
                device.IsOn,
                device.IsOnline,
                device.RoomId,
            })
            .ToListAsync(cancellationToken);

        var totalDevicesCount = userDevices.Count;

        if (totalDevicesCount == 0)
        {
            var emptySummary = new DashboardSummaryDto(0, 0, 0, false, 0, 0, 0);
            return Result.Success(new DashboardOverviewResponse(emptySummary, [], [], []));
        }

        // "Dispositivos Online" é conectividade (IsOnline), não estado de
        // energia (IsOn) — uma lâmpada desligada continua online (conectada
        // ao Hub), só não está ligada. Contar IsOn aqui divergia do card da
        // sidebar (que já conta IsOnline corretamente).
        var onlineDevicesCount = userDevices.Count(device => device.IsOnline);
        var userDeviceIds = userDevices.Select(d => d.Id).ToList();

        var activeAlertsCount = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(events => events.User.ExternalAuthUid == request.FirebaseUid && events.IsAlert)
            .CountAsync(cancellationToken);

        // TargetDateUtc.Date descartaria o offset e viraria DateTime
        // Unspecified — ao comparar com a coluna timestamptz, o EF/Npgsql
        // reinterpreta esse valor usando o fuso LOCAL do servidor (não UTC),
        // deslocando a janela do dia por horas erradas. Construir a data já
        // como DateTimeOffset com offset zero evita essa reinterpretação.
        var startOfDayUtc = new DateTimeOffset(
            request.TargetDateUtc.UtcDateTime.Date,
            TimeSpan.Zero
        );
        var endOfDayUtc = startOfDayUtc.AddDays(1);

        const int bucketMinutes = 5;

        var rawEnergyLogs = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
                && log.Timestamp >= startOfDayUtc
                && log.Timestamp < endOfDayUtc
                && log.PowerUsageWatts.HasValue
            )
            .Select(log => new
            {
                log.Timestamp,
                log.DeviceId,
                log.PowerUsageWatts,
                log.IsEstimated,
            })
            .ToListAsync(cancellationToken);

        DateTimeOffset FloorToBucket(DateTimeOffset timestamp)
        {
            var flooredMinute = (timestamp.Minute / bucketMinutes) * bucketMinutes;
            return new DateTimeOffset(
                timestamp.Year,
                timestamp.Month,
                timestamp.Day,
                timestamp.Hour,
                flooredMinute,
                0,
                TimeSpan.Zero
            );
        }

        // Energia (kWh) é potência × tempo, não a soma bruta das amostras de
        // Watts — como a telemetria chega a cada poucos segundos, somar as
        // amostras direto infla o total proporcionalmente à frequência de
        // leitura (10 leituras de 50W num balde de 5min não são "500W", são
        // só 50W sustentados). Por isso: 1) reduz cada (dispositivo, balde) à
        // potência MÉDIA nesse balde — elimina a distorção da frequência de
        // amostragem — e só então 2) soma a potência média dos dispositivos
        // concorrentes no balde e multiplica pela duração do balde em horas.
        var deviceBucketAverages = rawEnergyLogs
            .GroupBy(log => (Bucket: FloorToBucket(log.Timestamp), log.DeviceId))
            .Select(group => new
            {
                group.Key.Bucket,
                group.Key.DeviceId,
                AverageWatts = group.Average(x => x.PowerUsageWatts!.Value),
                IsEstimated = group.Any(x => x.IsEstimated),
            })
            .ToList();

        var bucketDurationHours = bucketMinutes / 60.0;

        // Cada ponto é a potência MÉDIA (kW) da casa naquele balde — soma da
        // potência média de cada dispositivo concorrente, sem multiplicar
        // pela duração. É "quanto está sendo puxado agora", não energia.
        var energyChartData = deviceBucketAverages
            .GroupBy(x => x.Bucket)
            .Select(group => new EnergyChartPointDto(
                group.Key,
                Math.Round(group.Sum(x => x.AverageWatts) / 1000.0, 4),
                group.Any(x => x.IsEstimated)
            ))
            .OrderBy(point => point.Timestamp)
            .ToList();

        // Baldes sem nenhuma amostra de telemetria (ex: hub reiniciado, gap
        // de rede) simplesmente não entram no array acima — como o eixo X do
        // gráfico é posicional (um ponto por índice, não por tempo real),
        // "pular" um balde faz o espaçamento visual entre pontos vizinhos
        // variar (5, 10, 15 min...) dependendo de onde os buracos caem.
        // Preenche os baldes faltantes entre o primeiro e o último ponto real
        // com 0kW pra manter o eixo uniforme.
        if (energyChartData.Count > 1)
        {
            var filledChartData = new List<EnergyChartPointDto>();
            var existingByBucket = energyChartData.ToDictionary(point => point.Timestamp);
            var lastBucket = energyChartData[^1].Timestamp;

            for (
                var bucket = energyChartData[0].Timestamp;
                bucket <= lastBucket;
                bucket = bucket.AddMinutes(bucketMinutes)
            )
            {
                filledChartData.Add(
                    existingByBucket.TryGetValue(bucket, out var existingPoint)
                        ? existingPoint
                        : new EnergyChartPointDto(bucket, 0, false)
                );
            }

            energyChartData = filledChartData;
        }

        // Energia total do dia (kWh) = integral de potência × tempo — soma de
        // cada ponto do gráfico (kW) multiplicado pela duração do seu balde.
        var totalConsumptionKwh = energyChartData.Sum(point => point.Value) * bucketDurationHours;

        var yesterdayStartUtc = startOfDayUtc.AddDays(-1);

        var todayTemperatures = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
                && log.Timestamp >= startOfDayUtc
                && log.Timestamp < endOfDayUtc
                && log.TemperatureCelsius.HasValue
            )
            .Select(log => log.TemperatureCelsius!.Value)
            .ToListAsync(cancellationToken);

        var yesterdayTemperatures = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
                && log.Timestamp >= yesterdayStartUtc
                && log.Timestamp < startOfDayUtc
                && log.TemperatureCelsius.HasValue
            )
            .Select(log => log.TemperatureCelsius!.Value)
            .ToListAsync(cancellationToken);

        // Sem leitura hoje = 0 (mesmo padrão de "sem dado" usado nos outros
        // campos do summary). Tendência só faz sentido com baseline de ontem;
        // sem os dois lados, fica 0 em vez de um delta enganoso.
        var averageTemperatureCelsius =
            todayTemperatures.Count > 0 ? Math.Round(todayTemperatures.Average(), 1) : 0;

        var temperatureTrend =
            todayTemperatures.Count > 0 && yesterdayTemperatures.Count > 0
                ? Math.Round(todayTemperatures.Average() - yesterdayTemperatures.Average(), 1)
                : 0;

        // Consumo real por cômodo: mesma base (deviceBucketAverages, já livre
        // da distorção de frequência de amostragem) do gráfico acima, só que
        // agrupada pelo cômodo de cada dispositivo em vez de pelo balde de
        // tempo — RoomId nulo agrupa os dispositivos sem ambiente.
        var deviceRoomIds = userDevices.ToDictionary(d => d.Id, d => d.RoomId);

        var roomUsageData = deviceBucketAverages
            .GroupBy(x => deviceRoomIds.GetValueOrDefault(x.DeviceId))
            .Select(group => new RoomEnergyUsageDto(
                group.Key,
                Math.Round(group.Sum(x => x.AverageWatts) * bucketDurationHours / 1000.0, 4),
                group.Any(x => x.IsEstimated)
            ))
            .ToList();

        var recentActivities = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(events => events.User.ExternalAuthUid == request.FirebaseUid)
            .OrderByDescending(events => events.Timestamp)
            .Take(4)
            .Select(e => new RecentEventDto(e.Id, e.Timestamp, e.Title, e.Description, e.EventType))
            .ToListAsync(cancellationToken);

        var summary = new DashboardSummaryDto(
            TotalDevicesCount: totalDevicesCount,
            OnlineDevicesCount: onlineDevicesCount,
            EnergyConsumptionKwh: Math.Round(totalConsumptionKwh, 4),
            IsEnergyEstimated: energyChartData.Any(point => point.IsEstimated),
            AverageTemperatureCelsius: averageTemperatureCelsius,
            TemperatureTrend: temperatureTrend,
            ActiveAlertsCount: activeAlertsCount
        );

        var response = new DashboardOverviewResponse(
            Summary: summary,
            EnergyChart: energyChartData,
            RoomUsage: roomUsageData,
            RecentActivities: recentActivities
        );

        return Result.Success(response);
    }
}
