namespace SmartHomeHub.Domain.Entities;

public class DeviceTelemetryLog
{
    public DateTimeOffset Timestamp { get; set; }

    public Guid DeviceId { get; set; }
    public Device Device { get; set; } = null!;

    public bool IsOn { get; set; }
    public int? Voltage { get; set; }
    public string? SignalStrength { get; set; }

    public double? TemperatureCelsius { get; set; }
    public double? HumidityPercent { get; set; }
    public double? PowerUsageWatts { get; set; }

    // Dispositivos sem sensor de energia real (ex: TV controlada via ADB/Cast,
    // sem API de consumo) recebem uma estimativa baseada na potência média
    // típica do tipo de aparelho, não uma leitura medida. Marca a origem do
    // dado pra não confundir o usuário sobre o que é medição real.
    public bool IsEstimated { get; set; }
}
