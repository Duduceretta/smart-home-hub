namespace SmartHomeHub.Domain.ValueObjects;

/// <summary>
/// Atributos voláteis e específicos de categoria de hardware (luzes, clima, etc.)
/// serializados como JSONB na tabela DeviceLiveStates. Permite adicionar novas
/// categorias (ex: termostato, cortina) sem exigir novas migrations.
/// </summary>
public class DeviceLiveStateAttributes
{
    // Iluminação
    public int? Brightness { get; set; }
    public string? ColorHex { get; set; }
    public int? ColorTempPercent { get; set; }
}
