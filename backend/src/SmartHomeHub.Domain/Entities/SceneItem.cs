namespace SmartHomeHub.Domain.Entities;

/// <summary>
/// Estado desejado de um dispositivo dentro de uma <see cref="Scene"/>. Espelha os
/// campos de <see cref="DeviceLiveState"/> que os comandos de dispositivo já sabem
/// aplicar: <c>null</c> em um atributo significa "a cena não mexe nele".
/// </summary>
public class SceneItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SceneId { get; set; }
    public Guid DeviceId { get; set; }

    public bool IsOn { get; set; }
    public int? Brightness { get; set; }
    public string? ColorHex { get; set; }
    public int? ColorTempPercent { get; set; }

    public Scene Scene { get; set; } = null!;
    public Device Device { get; set; } = null!;
}
