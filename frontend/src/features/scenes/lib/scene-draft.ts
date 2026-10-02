import type { SceneFormItem } from "../types/scene.schemas";
import type { SceneDevice, SceneItem } from "../types/scenes.types";
import { supportsLightAttributes } from "./scene-devices";

/**
 * Item novo a partir do estado ATUAL do dispositivo — é o que "pré-preenche" o editor:
 * o usuário ajusta o que a cena deve fazer em vez de partir do zero. Atributos de luz
 * só são copiados de luz Tuya local (a API recusa nos demais).
 */
export function createItemFromDevice(device: SceneDevice): SceneFormItem {
	const canTuneLight = supportsLightAttributes(device);

	return {
		deviceId: device.id,
		isOn: device.isOn,
		brightness: canTuneLight ? device.brightness : null,
		colorHex: canTuneLight ? device.colorHex : null,
		colorTempPercent: canTuneLight ? device.colorTempPercent : null,
	};
}

/** Item salvo na cena (read-model da API) → item do formulário. */
export function itemFromSceneItem(item: SceneItem): SceneFormItem {
	return {
		deviceId: item.deviceId,
		isOn: item.isOn,
		brightness: item.brightness,
		colorHex: item.colorHex,
		colorTempPercent: item.colorTempPercent,
	};
}

/**
 * Ordena os itens na ordem da lista de dispositivos, para o corpo enviado à API ser
 * determinístico (independe da ordem em que o usuário foi marcando). Item de dispositivo
 * desconhecido vai para o fim em vez de ser descartado em silêncio.
 */
export function orderItemsByDevices(
	items: SceneFormItem[],
	devices: SceneDevice[],
): SceneFormItem[] {
	const position = new Map(devices.map((device, index) => [device.id, index]));

	return [...items].sort(
		(a, b) =>
			(position.get(a.deviceId) ?? Number.MAX_SAFE_INTEGER) -
			(position.get(b.deviceId) ?? Number.MAX_SAFE_INTEGER),
	);
}

/**
 * Item que DESLIGA o dispositivo não carrega atributos de luz: eles não têm efeito e só
 * guardariam valor sem sentido.
 */
export function withoutAttributesWhenOff(item: SceneFormItem): SceneFormItem {
	return item.isOn
		? item
		: { ...item, brightness: null, colorHex: null, colorTempPercent: null };
}

/**
 * Itens prontos para ir à API: ordenados pela lista de dispositivos (corpo determinístico)
 * e sem atributos de luz nos que desligam o dispositivo.
 */
export function toPayloadItems(
	items: SceneFormItem[],
	devices: SceneDevice[],
): SceneFormItem[] {
	return orderItemsByDevices(items, devices).map(withoutAttributesWhenOff);
}

/**
 * Compara duas listas de itens como a API as enxerga (atributos de quem desliga não
 * contam). Usada para saber se a edição rápida tem alteração a salvar.
 */
export function itemsEqual(a: SceneFormItem[], b: SceneFormItem[]): boolean {
	if (a.length !== b.length) return false;

	return a.every((item, index) => {
		const left = withoutAttributesWhenOff(item);
		const right = withoutAttributesWhenOff(b[index] as SceneFormItem);

		return (
			left.deviceId === right.deviceId &&
			left.isOn === right.isOn &&
			left.brightness === right.brightness &&
			left.colorHex === right.colorHex &&
			left.colorTempPercent === right.colorTempPercent
		);
	});
}
