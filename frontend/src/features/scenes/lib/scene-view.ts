import type { Scene, SceneDevice } from "../types/scenes.types";
import type { SceneWashItem } from "./scene-wash";

export type SceneDeviceIndex = Map<string, SceneDevice>;

export interface SceneFilters {
	query: string;
	/** Ambiente selecionado; `null` = todos. */
	room: string | null;
}

export function toDeviceIndex(devices: SceneDevice[]): SceneDeviceIndex {
	return new Map(devices.map((device) => [device.id, device]));
}

/** Minúsculas e sem acentos, para a busca não depender de como o usuário digita. */
function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

function roomsOf(scene: Scene, index: SceneDeviceIndex): Set<string> {
	const rooms = new Set<string>();

	for (const item of scene.items) {
		const room = index.get(item.deviceId)?.room?.trim();
		if (room) rooms.add(room);
	}

	return rooms;
}

/**
 * Filtra as cenas pelo texto (nome da cena ou de qualquer dispositivo dela) e pelo
 * ambiente (cenas que mexem em algum dispositivo daquele ambiente). Cena não pertence
 * a um ambiente: o ambiente é derivado dos dispositivos.
 */
export function filterScenes(
	scenes: Scene[],
	index: SceneDeviceIndex,
	{ query, room }: SceneFilters,
): Scene[] {
	const needle = normalize(query);

	return scenes.filter((scene) => {
		if (room && !roomsOf(scene, index).has(room)) return false;
		if (!needle) return true;

		return (
			normalize(scene.name).includes(needle) ||
			scene.items.some(
				(item) =>
					normalize(item.deviceName).includes(needle) ||
					normalize(index.get(item.deviceId)?.name ?? "").includes(needle),
			)
		);
	});
}

/** Ambientes que aparecem em alguma cena, em ordem alfabética (chips de filtro). */
export function listRoomsInScenes(
	scenes: Scene[],
	index: SceneDeviceIndex,
): string[] {
	const rooms = new Set<string>();

	for (const scene of scenes) {
		for (const room of roomsOf(scene, index)) rooms.add(room);
	}

	return [...rooms].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Quantos dispositivos da cena estão offline agora (a ativação os pularia). */
export function countOfflineDevices(
	scene: Scene,
	index: SceneDeviceIndex,
): number {
	return scene.items.filter(
		(item) => index.get(item.deviceId)?.isOnline === false,
	).length;
}

export { normalize as normalizeSearchText };

/** Itens da cena no formato do light wash e da faixa de luz. */
export function toWashItems(scene: Scene): SceneWashItem[] {
	return scene.items.map((item) => ({
		deviceType: item.deviceType,
		isOn: item.isOn,
		brightness: item.brightness,
		colorHex: item.colorHex,
	}));
}
