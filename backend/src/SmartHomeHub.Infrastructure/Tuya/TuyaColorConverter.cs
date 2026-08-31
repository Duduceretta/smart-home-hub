using System.Text.RegularExpressions;

namespace SmartHomeHub.Infrastructure.Tuya;

/// <summary>
/// Conversões puras (sem I/O) entre os formatos que o front-end/API usam e os
/// valores reais de DP confirmados por diagnóstico manual (`QueryStatusAsync`
/// contra hardware real, ver comentários em `DeviceConfiguration.cs`):
/// brilho é DP numérico faixa 10-1000 (padrão Tuya `bright_value`, ainda
/// pendente de confirmação visual E2E — ver critério de aceite da feature),
/// cor é DP string HSV hex "HHHHSSSSVVVV" (H 0-360, S/V 0-1000), confirmado
/// por captura real (branco→vermelho, ver sessão de descoberta).
/// </summary>
public static partial class TuyaColorConverter
{
    private const int DeviceBrightnessMin = 10;
    private const int DeviceBrightnessMax = 1000;

    /// <summary>Converte 0-100% (UI) para a escala real do DP de brilho (10-1000).</summary>
    public static int PercentToDeviceBrightness(int percent)
    {
        var clampedPercent = Math.Clamp(percent, 0, 100);
        return DeviceBrightnessMin
            + (int)Math.Round((DeviceBrightnessMax - DeviceBrightnessMin) * (clampedPercent / 100.0));
    }

    /// <summary>Converte "#RRGGBB" para o formato de DP "HHHHSSSSVVVV" (HSV hex, 4 dígitos cada).</summary>
    public static string HexColorToDpValue(string hexColor)
    {
        if (!HexColorRegex().IsMatch(hexColor))
        {
            throw new ArgumentException(
                $"Cor inválida: '{hexColor}' não está no formato #RRGGBB.",
                nameof(hexColor)
            );
        }

        var r = Convert.ToInt32(hexColor.Substring(1, 2), 16) / 255.0;
        var g = Convert.ToInt32(hexColor.Substring(3, 2), 16) / 255.0;
        var b = Convert.ToInt32(hexColor.Substring(5, 2), 16) / 255.0;

        var max = Math.Max(r, Math.Max(g, b));
        var min = Math.Min(r, Math.Min(g, b));
        var delta = max - min;

        double hue;
        if (delta == 0)
            hue = 0;
        else if (max == r)
            hue = 60 * (((g - b) / delta) % 6);
        else if (max == g)
            hue = 60 * (((b - r) / delta) + 2);
        else
            hue = 60 * (((r - g) / delta) + 4);

        if (hue < 0)
            hue += 360;

        var saturation = max == 0 ? 0 : delta / max;
        var value = max;

        var h = (int)Math.Round(hue) % 360;
        var s = (int)Math.Round(saturation * 1000);
        var v = (int)Math.Round(value * 1000);

        return $"{h:x4}{s:x4}{v:x4}";
    }

    /// <summary>
    /// Heurística de detecção do DP de cor: valor string de exatamente 12
    /// dígitos hexadecimais (formato "HHHHSSSSVVVV") — seguro porque nenhum
    /// outro DP observado no diagnóstico manual tem esse formato específico
    /// (ao contrário de DPs numéricos, que colidem entre brilho/temp. de cor).
    /// </summary>
    public static bool LooksLikeColorDpValue(object? value) =>
        value is string text && ColorDpValueRegex().IsMatch(text);

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex HexColorRegex();

    [GeneratedRegex("^[0-9A-Fa-f]{12}$")]
    private static partial Regex ColorDpValueRegex();
}
