namespace SmartHomeHub.Application.Common.Telemetry;

/// <summary>
/// Potência MÉDIA (Watts) de um dispositivo dentro de um balde de tempo —
/// mesmo formato usado por GetDashboardOverviewQuery (gráfico da casa
/// inteira) e GetRoomEnergyQuery (gráfico por ambiente), pra manter o
/// critério de agregação idêntico nos dois.
/// </summary>
public record DeviceBucketAverage(
    DateTimeOffset Bucket,
    Guid DeviceId,
    double AverageWatts,
    bool IsEstimated
);

/// <summary>
/// Extraído de GetDashboardOverviewQuery — método estático puro (sem I/O,
/// sem estado), pra ser reaproveitado por qualquer query que precise
/// agrupar telemetria de potência em baldes de tempo fixos, sem duplicar o
/// critério de arredondamento nem a lógica de "potência média por balde
/// evita distorção por frequência de amostragem".
/// </summary>
public static class TelemetryBucketing
{
    public const int DefaultBucketMinutes = 5;

    /// <summary>
    /// Arredonda um timestamp pra baixo, pro início do balde de
    /// <paramref name="bucketMinutes"/> minutos em que ele cai (sempre em
    /// UTC/offset zero — os buckets são pontos de eixo, não horário local).
    /// </summary>
    public static DateTimeOffset FloorToBucket(
        DateTimeOffset timestamp,
        int bucketMinutes = DefaultBucketMinutes
    )
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

    /// <summary>
    /// Reduz cada (dispositivo, balde) à potência MÉDIA nesse balde —
    /// elimina a distorção que a soma bruta das amostras teria pela
    /// frequência de leitura (10 leituras de 50W num balde de 5min não são
    /// "500W", são só 50W sustentados). Descarta logs sem
    /// <c>PowerUsageWatts</c> (ex: leituras só de temperatura).
    /// </summary>
    public static List<DeviceBucketAverage> BuildDeviceBucketAverages(
        IEnumerable<(
            DateTimeOffset Timestamp,
            Guid DeviceId,
            double? PowerUsageWatts,
            bool IsEstimated
        )> logs,
        int bucketMinutes = DefaultBucketMinutes
    )
    {
        return logs.Where(log => log.PowerUsageWatts.HasValue)
            .GroupBy(log => (Bucket: FloorToBucket(log.Timestamp, bucketMinutes), log.DeviceId))
            .Select(group => new DeviceBucketAverage(
                group.Key.Bucket,
                group.Key.DeviceId,
                group.Average(x => x.PowerUsageWatts!.Value),
                group.Any(x => x.IsEstimated)
            ))
            .ToList();
    }
}
