import type {
	Scene,
	SceneActivationResult,
	SceneDevice,
	SceneItem,
	SceneMetrics,
} from "@/features/scenes/types/scenes.types";

export function createSceneItemMock(overrides?: Partial<SceneItem>): SceneItem {
	const defaultMock: SceneItem = {
		deviceId: "scene-dev-01",
		deviceName: "Luz da Sala",
		deviceType: 1,
		isOn: true,
		brightness: null,
		colorHex: null,
		colorTempPercent: null,
	};

	return { ...defaultMock, ...overrides };
}

export function createSceneMock(overrides?: Partial<Scene>): Scene {
	const defaultMock: Scene = {
		id: "scene-test-01",
		name: "Modo Cinema",
		icon: "clapperboard",
		lastActivatedAt: null,
		items: [
			// design-token-lint-ignore — cor de dado do usuário (colorHex), não token de design
			createSceneItemMock({ brightness: 10, colorHex: "#FFAA00" }),
			createSceneItemMock({
				deviceId: "scene-dev-02",
				deviceName: "Tomada TV",
				deviceType: 2,
				isOn: false,
			}),
		],
	};

	return { ...defaultMock, ...overrides };
}

export function createSceneDeviceMock(
	overrides?: Partial<SceneDevice>,
): SceneDevice {
	const defaultMock: SceneDevice = {
		id: "scene-dev-01",
		name: "Luz da Sala",
		brand: "Tuya",
		type: 1,
		integrationType: 8,
		room: "Sala",
		isOn: false,
		isOnline: true,
		brightness: null,
		colorHex: null,
		colorTempPercent: null,
	};

	return { ...defaultMock, ...overrides };
}

export function createSceneActivationResultMock(
	overrides?: Partial<SceneActivationResult>,
): SceneActivationResult {
	const defaultMock: SceneActivationResult = {
		sceneId: "scene-test-01",
		sceneName: "Modo Cinema",
		appliedCount: 2,
		failedCount: 0,
		skippedCount: 0,
		items: [
			{
				deviceId: "scene-dev-01",
				deviceName: "Luz da Sala",
				status: "Applied",
				reason: null,
			},
			{
				deviceId: "scene-dev-02",
				deviceName: "Tomada TV",
				status: "Applied",
				reason: null,
			},
		],
	};

	return { ...defaultMock, ...overrides };
}

export function createSceneStatsMock(
	overrides?: Partial<SceneMetrics>,
): SceneMetrics {
	const defaultMock: SceneMetrics = {
		activationsPerDay: [0, 1, 0, 2, 0, 1, 3],
		activationsTotal: 7,
		previousActivationsTotal: 5,
		successRate: 85.7,
		topScenes: [
			{ sceneId: "scene-1", name: "Modo Cinema", activations: 4 },
			{ sceneId: "scene-2", name: "Boa Noite", activations: 3 },
		],
		peakHour: "20:00",
		lastProblem: null,
	};

	return { ...defaultMock, ...overrides };
}
