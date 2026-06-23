namespace SmartHomeHub.Domain.Enums;

public enum DeviceType
{
    Light = 1, // Lâmpadas (Aceitam Ligar, Desligar, Mudar Cor/Brilho)
    Switch = 2, // Tomadas/Relés (Apenas Ligar/Desligar)
    Sensor = 3, // Sensores (Apenas enviam dados, ex: Temperatura, Presença)
    Thermostat = 4, // Ar condicionado/Termostatos
}
