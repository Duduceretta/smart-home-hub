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
    private const int DeviceColorTempMin = 0;
    private const int DeviceColorTempMax = 1000;

    /// <summary>Converte 0-100% (UI) para a escala real do DP de brilho (10-1000).</summary>
    public static int PercentToDeviceBrightness(int percent)
    {
        var clampedPercent = Math.Clamp(percent, 0, 100);
        return DeviceBrightnessMin
            + (int)
                Math.Round((DeviceBrightnessMax - DeviceBrightnessMin) * (clampedPercent / 100.0));
    }

    /// <summary>
    /// Inversa de <see cref="PercentToDeviceBrightness"/> — usada pelo polling
    /// (TuyaDeviceStatePollingWorker) pra converter o valor bruto lido de volta
    /// pro percentual que a UI espera, já que a leitura reporta o valor real do
    /// DP (10-1000), não o percentual original que foi escrito.
    /// </summary>
    public static int DeviceBrightnessToPercent(int deviceValue)
    {
        var clamped = Math.Clamp(deviceValue, DeviceBrightnessMin, DeviceBrightnessMax);
        return (int)
            Math.Round(
                (clamped - DeviceBrightnessMin)
                    * 100.0
                    / (DeviceBrightnessMax - DeviceBrightnessMin)
            );
    }

    /// <summary>
    /// Converte 0-100% (UI, 0=mais quente, 100=mais frio) pra escala real do
    /// DP de temperatura de cor (0-1000, faixa assumida — só um extremo
    /// confirmado por diagnóstico manual, ver DeviceConfiguration.cs).
    /// </summary>
    public static int PercentToDeviceColorTemp(int percent)
    {
        var clampedPercent = Math.Clamp(percent, 0, 100);
        return DeviceColorTempMin
            + (int)Math.Round((DeviceColorTempMax - DeviceColorTempMin) * (clampedPercent / 100.0));
    }

    /// <summary>
    /// Inversa de <see cref="PercentToDeviceColorTemp"/> — mesmo racional de
    /// <see cref="DeviceBrightnessToPercent"/>, usada pelo polling.
    /// </summary>
    public static int DeviceColorTempToPercent(int deviceValue)
    {
        var clamped = Math.Clamp(deviceValue, DeviceColorTempMin, DeviceColorTempMax);
        return (int)
            Math.Round(
                (clamped - DeviceColorTempMin) * 100.0 / (DeviceColorTempMax - DeviceColorTempMin)
            );
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
    /// Reaplica o componente V (brilho, 0-1000) de um valor de DP de cor já
    /// existente, preservando H/S — usado quando o brilho é ajustado com o
    /// dispositivo em modo colorido: escrever o DP de brilho "branco" (DP22)
    /// faz o hardware trocar sozinho pra modo branco (confirmado por
    /// diagnóstico manual), então em modo colorido o brilho precisa virar o
    /// V do HSV em vez de tocar o DP branco. Se o valor existente não for um
    /// HSV hex válido (ainda não tem cor definida), assume H=0/S=1000
    /// (vermelho puro saturado) como fallback razoável.
    /// </summary>
    public static string ReplaceHsvValueComponent(string? existingDpValue, int brightnessPercent)
    {
        var (h, s) =
            existingDpValue is not null && ColorDpValueRegex().IsMatch(existingDpValue)
                ? (existingDpValue[..4], existingDpValue[4..8])
                : ("0000", "03e8");

        var v = PercentToDeviceBrightness(brightnessPercent);
        return $"{h}{s}{v:x4}";
    }

    /// <summary>
    /// Extrai só o componente V (brilho, 0-1000) de um DP de cor já existente —
    /// usado pelo polling pra reportar o brilho efetivo quando o dispositivo
    /// está em modo colorido (nesse modo o brilho "mora" no V do HSV, não no DP
    /// de brilho branco — mesmo racional de <see cref="ReplaceHsvValueComponent"/>,
    /// só que lendo em vez de escrever).
    /// </summary>
    public static int ExtractHsvValueComponent(string hsvHex) => Convert.ToInt32(hsvHex[8..12], 16);

    /// <summary>
    /// Inversa de <see cref="HexColorToDpValue"/> — converte o DP de cor
    /// "HHHHSSSSVVVV" (HSV hex) de volta pra "#RRGGBB", usada pelo polling pra
    /// reportar a cor atual lida do dispositivo no mesmo formato que a UI e o
    /// comando de escrita (SetDeviceColorAsync) já usam.
    /// </summary>
    public static string DpValueToHexColor(string hsvHex)
    {
        var h = Convert.ToInt32(hsvHex[..4], 16) % 360;
        var s = Convert.ToInt32(hsvHex[4..8], 16) / 1000.0;
        var v = Convert.ToInt32(hsvHex[8..12], 16) / 1000.0;

        var c = v * s;
        var x = c * (1 - Math.Abs(h / 60.0 % 2 - 1));
        var m = v - c;

        var (rPrime, gPrime, bPrime) = h switch
        {
            < 60 => (c, x, 0.0),
            < 120 => (x, c, 0.0),
            < 180 => (0.0, c, x),
            < 240 => (0.0, x, c),
            < 300 => (x, 0.0, c),
            _ => (c, 0.0, x),
        };

        var r = (int)Math.Round((rPrime + m) * 255);
        var g = (int)Math.Round((gPrime + m) * 255);
        var b = (int)Math.Round((bPrime + m) * 255);

        return $"#{r:X2}{g:X2}{b:X2}";
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
