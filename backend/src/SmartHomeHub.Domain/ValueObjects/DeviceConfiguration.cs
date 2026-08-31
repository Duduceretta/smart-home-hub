namespace SmartHomeHub.Domain.ValueObjects;

public class DeviceConfiguration
{
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? LocalKey { get; set; }

    // "3.3", "3.4", "3.5"... null/ausente = legado (TuyaNetProtocolClient, v3.1/v3.3).
    public string? ProtocolVersion { get; set; }
    public string? DpsPowerKey { get; set; } = "20";

    // Sem heurística confiável de "único DP numérico" (brilho e temperatura de
    // cor são ambos numéricos) — ao contrário do DP de power (booleano, quase
    // sempre único), o default abaixo é o DP real confirmado por
    // QueryStatusAsync na lâmpada de referência (ver diagnóstico manual via
    // /api/dev/tuya-query-status), reaproveitado como fallback igual DpsPowerKey.
    public string? DpsBrightnessKey { get; set; } = "22";

    // DP de cor (HSV hex "HHHHSSSSVVVV") tem heurística segura: é a única
    // string de 12 dígitos hex entre os DPs — resolvido em
    // TuyaLocalControlService.ResolveColorDp. Default abaixo é só o fallback
    // pra quando a heurística não achar nada.
    public string? DpsColorKey { get; set; } = "24";

    // DP de temperatura de cor (branco quente/frio) — mesma ambiguidade
    // numérica de DpsBrightnessKey (colide com DP22), confirmado por
    // diagnóstico manual (mudou de 1000 pra 830 ao trocar o tom do branco
    // pelo app real). Faixa 0-1000 assumida (padrão Tuya `temp_value`),
    // pendente de confirmação visual E2E completa (só um extremo testado).
    public string? DpsColorTempKey { get; set; } = "23";

    public string? ClientKey { get; set; }
    public string? CommandTopic { get; set; }
    public string? StateTopic { get; set; }

    // Override manual — a detecção automática de suporte a RGB (ver
    // TuyaLocalControlService) só marca true depois que o DP de cor aparece
    // numa resposta real (falso negativo enquanto o bulbo nunca esteve em modo
    // colorido). null = ainda não detectado/definido; true/false definido
    // explicitamente aqui (via EditDeviceModal) sempre vence a detecção.
    public bool? SupportsColor { get; set; }
}
