namespace SmartHomeHub.Domain.Enums;

public enum DeviceType
{
    Light = 1, // Lâmpadas (Aceitam Ligar, Desligar, Mudar Cor/Brilho)
    Switch = 2, // Tomadas/Relés (Apenas Ligar/Desligar)
    Sensor = 3, // Sensores (Apenas enviam dados, ex: Temperatura, Presença)
    Thermostat = 4, // Ar condicionado/Termostatos
    Camera = 5, // Câmeras (Apenas enviam dados, ex: Vídeo, Áudio)
    Lock = 6, // Fechaduras (Apenas Ligar/Desligar)
    Alarm = 7, // Alarmes (Apenas Ligar/Desligar)
}
