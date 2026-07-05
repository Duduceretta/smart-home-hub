export enum DeviceTypeEnum {
    Light = 1,
    Switch = 2,
    Sensor = 3,
    Thermostat = 4,
    Camera = 5,
    Lock = 6,
    Alarm = 7,
}

export type StatusFilterType = "online" | "offline" | null;

export interface Device {
    id: string;
    name: string;
    brand: string;
    externalId: string;
    type: DeviceTypeEnum;
    category: string;
    room: string;
    roomId?: string | null;
    isOnline: boolean;
    isOn: boolean;
    lastActivityMinutes?: number;
}

export interface CreateDevicePayload {
    name: string;
    brand: string;
    externalId: string;
    type: DeviceTypeEnum;
    roomId: string | null;
}

export interface CreateDeviceResponse {
    message: string;
    deviceId: string;
}

// 🛡️ Regra de Domínio: Define quais tipos aceitam botão de Ligar/Desligar no Card
export function isActuatorDevice(type: DeviceTypeEnum): boolean {
    return [
        DeviceTypeEnum.Light,
        DeviceTypeEnum.Switch,
        DeviceTypeEnum.Thermostat,
        DeviceTypeEnum.Lock,
        DeviceTypeEnum.Alarm,
    ].includes(type);
}