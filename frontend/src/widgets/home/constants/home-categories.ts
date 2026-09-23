import { DeviceTypeEnum } from "@/features/devices/types/devices.types";

/**
 * Famílias categóricas da Início → séries `chart-1..5` (docs/theme-proposal.md §7).
 * Categoria nunca usa status (`success`/`warning`/`info`/`alert`) nem `primary`.
 *
 * Os ícones categóricos ficam sempre num poço `bg-muted`: os `chart-*` têm ≥ 3:1
 * garantido contra `card` pelo `check:theme`, e `muted` é mais escuro que `card`
 * — sobre `popover`/`surface-highest` as séries mais escuras (chart-1/2) caem
 * abaixo de 3:1. Classes literais (não interpoladas) para o Tailwind gerar.
 */
export const CATEGORY_ICON_CLASS = {
	lighting: "text-chart-1",
	climate: "text-chart-2",
	monitoring: "text-chart-3",
	media: "text-chart-4",
	security: "text-chart-5",
} as const;

export const CATEGORY_FILL_CLASS = {
	lighting: "bg-chart-1",
	climate: "bg-chart-2",
	monitoring: "bg-chart-3",
	media: "bg-chart-4",
	security: "bg-chart-5",
} as const;

export type HomeCategory = keyof typeof CATEGORY_ICON_CLASS;

export const DEVICE_CATEGORY: Record<DeviceTypeEnum, HomeCategory> = {
	[DeviceTypeEnum.Light]: "lighting",
	[DeviceTypeEnum.Switch]: "lighting",
	[DeviceTypeEnum.Thermostat]: "climate",
	[DeviceTypeEnum.Sensor]: "monitoring",
	[DeviceTypeEnum.Camera]: "monitoring",
	[DeviceTypeEnum.Television]: "media",
	[DeviceTypeEnum.Lock]: "security",
	[DeviceTypeEnum.Alarm]: "security",
};
