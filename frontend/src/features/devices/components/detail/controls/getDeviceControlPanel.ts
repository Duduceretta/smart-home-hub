import type { ComponentType } from "react";
import { DeviceTypeEnum } from "../../../types/devices.types";
import { ClimateControlPanel } from "./ClimateControlPanel";
import type { DeviceControlPanelProps } from "./device-control-panel.types";
import { LightControlPanel } from "./LightControlPanel";
import { SwitchControlPanel } from "./SwitchControlPanel";
import { TvControlPanel } from "./TvControlPanel";

/**
 * Registro central categoria → painel de controle. Categorias sem entrada
 * (Sensor, Camera, Lock, Alarm) não têm controle específico — o chamador
 * trata `undefined` omitindo a seção, sem `if`s espalhados pelos
 * componentes de detalhe.
 */
const DEVICE_CONTROL_PANEL_REGISTRY: Partial<
	Record<DeviceTypeEnum, ComponentType<DeviceControlPanelProps>>
> = {
	[DeviceTypeEnum.Light]: LightControlPanel,
	[DeviceTypeEnum.Switch]: SwitchControlPanel,
	[DeviceTypeEnum.Thermostat]: ClimateControlPanel,
	[DeviceTypeEnum.Television]: TvControlPanel,
};

export function getDeviceControlPanel(
	type: DeviceTypeEnum,
): ComponentType<DeviceControlPanelProps> | undefined {
	return DEVICE_CONTROL_PANEL_REGISTRY[type];
}
