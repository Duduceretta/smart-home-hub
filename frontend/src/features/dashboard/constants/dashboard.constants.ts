import { Home, LogOut, Moon, PlaySquare } from "lucide-react";
import type { ComponentType } from "react";
import { DeviceTypeEnum } from "@/features/devices/types/devices.types";

/**
 * Chaves de tradução sob `scenesBar.*` no namespace `dashboard` — igual ao
 * padrão de `RoomIconLabelKey` em features/rooms/constants/rooms.constants.ts.
 */
export type SceneLabelKey =
	| "scenesBar.arriveHome"
	| "scenesBar.movieMode"
	| "scenesBar.sleepMode"
	| "scenesBar.leaveHome";

export interface SceneOption {
	key: string;
	labelKey: SceneLabelKey;
	icon: ComponentType<{ className?: string }>;
}

/**
 * Cenas rápidas exibidas na dashboard — placeholder visual, sem onClick
 * funcional/mutations. Cenas configuráveis ficam para uma etapa futura que
 * envolveria uma feature de backend própria.
 */
export const SCENES: SceneOption[] = [
	{ key: "arriveHome", labelKey: "scenesBar.arriveHome", icon: Home },
	{ key: "movieMode", labelKey: "scenesBar.movieMode", icon: PlaySquare },
	{ key: "sleepMode", labelKey: "scenesBar.sleepMode", icon: Moon },
	{ key: "leaveHome", labelKey: "scenesBar.leaveHome", icon: LogOut },
];

/**
 * roomKey usado no dashboard-preview.store para o bucket de dispositivos
 * sem ambiente. Compartilhado entre DashboardView (agregação do
 * expandir/recolher todos) e RoomDeviceSection (leitura/escrita do próprio
 * estado) — precisa ser exatamente a mesma string nos dois lugares, senão
 * o botão de agregação lê uma chave que a seção nunca escreve.
 */
export const UNASSIGNED_ROOM_KEY = "__unassigned__";

export type ChipKey = "all" | "lights" | "climate" | "media";

export const DEVICE_TYPE_CHIPS: ChipKey[] = [
	"all",
	"lights",
	"climate",
	"media",
];

/**
 * Mapeia cada chip de filtro pro(s) DeviceTypeEnum correspondente — null
 * significa "sem filtro" (mostra todos os tipos).
 */
export const CHIP_TO_TYPES: Record<ChipKey, DeviceTypeEnum[] | null> = {
	all: null,
	lights: [DeviceTypeEnum.Light],
	climate: [DeviceTypeEnum.Thermostat, DeviceTypeEnum.Sensor],
	media: [DeviceTypeEnum.Television],
};
