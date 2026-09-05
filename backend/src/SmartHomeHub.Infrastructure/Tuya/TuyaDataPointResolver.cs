namespace SmartHomeHub.Infrastructure.Tuya;

/// <summary>
/// Resolve, a partir do status bruto retornado pelo protocolo Tuya (mapa DP -&gt;
/// valor), qual Data Point numérico corresponde a cada atributo lógico
/// (liga/desliga, brilho, cor, temperatura de cor, modo de operação). Puramente
/// funcional — sem estado de instância. Extraído de TuyaLocalControlService
/// (ver backend-audit-2026-09-05.md, seção 05) — extração mecânica, mesma lógica.
/// </summary>
internal static class TuyaDataPointResolver
{
    // Fallbacks literais (não o default do property initializer de
    // DeviceConfiguration) — dispositivos cadastrados antes desses campos
    // existirem têm a chave ausente do JSON persistido, o que desserializa
    // como null, não como o default da classe (confirmado inspecionando a
    // coluna Configuration real no Postgres). Sem heurística segura de
    // "único DP numérico" (brilho/temp. de cor colidem entre si), então o
    // fallback é o valor fixo confirmado por diagnóstico manual, igual
    // documentado em DeviceConfiguration.cs.
    public const int DefaultBrightnessDp = 22;
    public const int DefaultColorTempDp = 23;

    public static int? ResolveDp(
        string? configuredDp,
        IReadOnlyDictionary<int, object?> status,
        string tuyaDeviceId
    )
    {
        if (
            int.TryParse(configuredDp, out var configured)
            && status.TryGetValue(configured, out var configuredValue)
            && configuredValue is bool
        )
        {
            return configured;
        }

        var booleanDps = status.Where(kv => kv.Value is bool).Select(kv => kv.Key).ToArray();

        return booleanDps.Length > 0 ? booleanDps[0] : null;
    }

    public static int? ResolveNumericDp(
        string? configuredDp,
        IReadOnlyDictionary<int, object?> status,
        int defaultDp
    )
    {
        if (
            int.TryParse(configuredDp, out var configured)
            && status.TryGetValue(configured, out var configuredValue)
            && configuredValue is double
        )
        {
            return configured;
        }

        if (status.TryGetValue(defaultDp, out var defaultValue) && defaultValue is double)
        {
            return defaultDp;
        }

        return null;
    }

    public static int? ResolveColorDp(
        string? configuredDp,
        IReadOnlyDictionary<int, object?> status
    )
    {
        if (
            int.TryParse(configuredDp, out var configured)
            && status.TryGetValue(configured, out var configuredValue)
            && TuyaColorConverter.LooksLikeColorDpValue(configuredValue)
        )
        {
            return configured;
        }

        var candidate = status.FirstOrDefault(kv =>
            TuyaColorConverter.LooksLikeColorDpValue(kv.Value)
        );
        return candidate.Value is not null ? candidate.Key : null;
    }

    private static readonly HashSet<string> WorkModeValues = new(StringComparer.OrdinalIgnoreCase)
    {
        "white",
        "colour",
        "color",
        "scene",
        "music",
    };

    public static int? ResolveWorkModeDp(IReadOnlyDictionary<int, object?> status)
    {
        var candidate = status.FirstOrDefault(kv =>
            kv.Value is string text && WorkModeValues.Contains(text)
        );
        return candidate.Value is not null ? candidate.Key : null;
    }
}
