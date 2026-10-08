import type { SceneDevice } from "../types/scenes.types";

/** Valores do enum `DeviceType` do backend que o editor de cena precisa distinguir. */
const DEVICE_TYPE_LIGHT = 1;
const DEVICE_TYPE_SENSOR = 3;
const DEVICE_TYPE_CAMERA = 5;
const DEVICE_TYPE_LOCK = 6;
const DEVICE_TYPE_ALARM = 7;

/** Valor do enum `IntegrationType` do backend: luz com controle local Tuya. */
const INTEGRATION_TUYA_LOCAL = 8;

/**
 * Sensor, câmera, fechadura e alarme nunca entram em cena: sensor e câmera não
 * aceitam comando de estado, e fechadura/alarme ficam fora do MVP por segurança
 * (a API recusa com 422 `Scene.Validation.UnsupportedDeviceType`).
 */
const NON_SCENE_TYPES = new Set([
	DEVICE_TYPE_SENSOR,
	DEVICE_TYPE_CAMERA,
	DEVICE_TYPE_LOCK,
	DEVICE_TYPE_ALARM,
]);

export function isSceneEligibleDevice(device: Pick<SceneDevice, "type">) {
	return !NON_SCENE_TYPES.has(device.type);
}

/**
 * Brilho, cor e temperatura de cor só valem para luz Tuya com controle local —
 * mesma condição dos comandos de dispositivo do backend (a API recusa com 422
 * `Scene.Validation.UnsupportedAttributes` nos demais).
 */
export function supportsLightAttributes(
	device: Pick<SceneDevice, "type" | "integrationType">,
) {
	return (
		device.type === DEVICE_TYPE_LIGHT &&
		device.integrationType === INTEGRATION_TUYA_LOCAL
	);
}
