/**
 * Estado desejado de um dispositivo dentro de uma cena (SceneItemDto).
 * `null` em um atributo significa "a cena não mexe nesse atributo".
 */
export interface SceneItem {
	deviceId: string;
	deviceName: string;
	/** Espelha o enum `DeviceType` do backend (1 Light, 2 Switch, ... 8 Television). */
	deviceType: number;
	isOn: boolean;
	brightness: number | null;
	colorHex: string | null;
	colorTempPercent: number | null;
}

/**
 * Read-model de cena devolvido pela API (SceneDto).
 */
export interface Scene {
	id: string;
	name: string;
	icon: string | null;
	lastActivatedAt: string | null;
	items: SceneItem[];
}

export interface SceneItemPayload {
	deviceId: string;
	isOn: boolean;
	brightness?: number | null;
	colorHex?: string | null;
	colorTempPercent?: number | null;
}

/**
 * Corpo aceito por POST /scenes e PUT /scenes/{id} (SaveSceneRequest).
 */
export interface SaveScenePayload {
	name: string;
	icon?: string | null;
	items: SceneItemPayload[];
}

export type CreateScenePayload = SaveScenePayload;
export type UpdateScenePayload = SaveScenePayload;

export interface CreateSceneResponse {
	message: string;
	sceneId: string;
}

/** Desfecho de um dispositivo na ativação — `status` vem como string do backend. */
export type SceneActivationStatus = "Applied" | "Failed" | "Skipped";

export interface SceneActivationItemResult {
	deviceId: string;
	deviceName: string;
	status: SceneActivationStatus;
	reason: string | null;
}

export interface SceneActivationResult {
	sceneId: string;
	sceneName: string;
	appliedCount: number;
	failedCount: number;
	skippedCount: number;
	items: SceneActivationItemResult[];
}

/**
 * Forma mínima de dispositivo que o editor de cena precisa — deliberadamente
 * não é o `Device` da feature `devices` (isolamento FSD).
 */
export interface SceneDevice {
	id: string;
	name: string;
	brand: string;
	/** Espelha o enum `DeviceType` do backend. */
	type: number;
	/** Espelha o enum `IntegrationType` do backend (8 = TuyaLocal). */
	integrationType: number;
	room: string;
	isOn: boolean;
	isOnline: boolean;
	brightness: number | null;
	colorHex: string | null;
	colorTempPercent: number | null;
}

/**
 * Métricas de uso das cenas exibidas na coluna lateral. O contrato definitivo vem do
 * backend (NH-58); enquanto isso o painel aceita `null` e mostra o estado vazio.
 */
export interface SceneMetrics {
	/** Ativações por dia nos últimos 7 dias, do mais antigo para o mais recente. */
	activationsPerDay: number[];
	activationsTotal: number;
	/** Porcentagem (0-100) de ativações sem falha nem dispositivo offline; `null` sem ativações. */
	successRate: number | null;
	topScenes: { sceneId: string; name: string; activations: number }[];
	/** Horário de pico no formato "HH:mm"; `null` sem ativações. */
	peakHour: string | null;
}
