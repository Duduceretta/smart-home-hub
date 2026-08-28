import {
	Camera,
	Lightbulb,
	Lock,
	Power,
	Radar,
	Siren,
	Thermometer,
	Tv,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Ícone por tipo de dispositivo, reimplementado localmente na feature
 * `rooms` (FSD: não importar `DEVICE_CONFIG` da feature `devices`). Chaves
 * numéricas espelham o `DeviceTypeEnum` do back-end (ver `devices.types.ts`
 * na feature `devices`): 1 Luz, 2 Tomada, 3 Sensor, 4 Termostato, 5 Câmera,
 * 6 Fechadura, 7 Alarme, 8 TV.
 */
export const ROOM_DEVICE_TYPE_ICON: Record<
	number,
	ComponentType<{ className?: string }>
> = {
	1: Lightbulb,
	2: Power,
	3: Radar,
	4: Thermometer,
	5: Camera,
	6: Lock,
	7: Siren,
	8: Tv,
};

export const ROOM_DEVICE_TELEVISION_TYPE = 8;

/**
 * Tipos com estado binário (Ligado/Desligado) toggleável via `Switch`,
 * exceto TV — tratada à parte com botão "Controle" em vez de switch.
 */
export const ROOM_DEVICE_ACTUATOR_TYPES = new Set([1, 2, 4, 6, 7, 8]);
