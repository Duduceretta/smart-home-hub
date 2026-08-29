namespace SmartHomeHub.Domain.Enums;

public enum AutomationTriggerKind
{
    Schedule = 1, // TimeTrigger (cron)
    Sensor = 2, // DeviceStateTrigger
}
