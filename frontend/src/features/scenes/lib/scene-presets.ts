import {
	COLOR_AMBER,
	COLOR_BLUE,
	COLOR_COOL_WHITE,
	COLOR_GREEN,
	COLOR_PINK,
	COLOR_PURPLE,
	COLOR_WARM_WHITE,
} from "../constants/scene-colors";
import type { SceneFormItem } from "../types/scene.schemas";
import type { SceneDevice } from "../types/scenes.types";
import { supportsLightAttributes } from "./scene-devices";

/** Valores do enum `DeviceType` do backend usados pelas predefinições. */
const DEVICE_TYPE_LIGHT = 1;
const DEVICE_TYPE_THERMOSTAT = 4;
const DEVICE_TYPE_TELEVISION = 8;

interface LightsSpec {
	on: boolean;
	/** Só vale em luz Tuya local; nas demais a luz apenas liga. */
	brightness?: number;
	/** Cores aplicadas em rodízio, uma por luz. */
	colors?: string[];
}

interface PowerSpec {
	on: boolean;
}

/**
 * Predefinição de cena: uma receita por TIPO de dispositivo, não por dispositivo
 * específico, para servir na casa de qualquer usuário. Tomadas nunca entram — desligar
 * uma tomada pode cortar a geladeira.
 */
export interface ScenePreset {
	id: string;
	/** Chave sob `presets` no namespace `scenes`. */
	nameKey: string;
	/** Nome em pt-BR, fallback do `t()`. */
	defaultName: string;
	descriptionKey: string;
	defaultDescription: string;
	/** Id de ícone de `SCENE_ICON_OPTIONS`. */
	icon: string;
	lights?: LightsSpec;
	televisions?: PowerSpec;
	thermostats?: PowerSpec;
}

export const SCENE_PRESETS: ScenePreset[] = [
	{
		id: "good-morning",
		nameKey: "presets.goodMorning.name",
		defaultName: "Bom Dia",
		descriptionKey: "presets.goodMorning.description",
		defaultDescription: "Luzes a 80% em branco quente",
		icon: "sun",
		lights: { on: true, brightness: 80, colors: [COLOR_WARM_WHITE] },
	},
	{
		id: "arrive-home",
		nameKey: "presets.arriveHome.name",
		defaultName: "Chegar em Casa",
		descriptionKey: "presets.arriveHome.description",
		defaultDescription: "Luzes a 70% em branco quente e climatização ligada",
		icon: "door-open",
		lights: { on: true, brightness: 70, colors: [COLOR_WARM_WHITE] },
		thermostats: { on: true },
	},
	{
		id: "leave-home",
		nameKey: "presets.leaveHome.name",
		defaultName: "Sair de Casa",
		descriptionKey: "presets.leaveHome.description",
		defaultDescription:
			"Desliga luzes, TV e climatização (tomadas ficam como estão)",
		icon: "log-out",
		lights: { on: false },
		televisions: { on: false },
		thermostats: { on: false },
	},
	{
		id: "good-night",
		nameKey: "presets.goodNight.name",
		defaultName: "Boa Noite",
		descriptionKey: "presets.goodNight.description",
		defaultDescription: "Desliga luzes e TV",
		icon: "moon",
		lights: { on: false },
		televisions: { on: false },
	},
	{
		id: "relax",
		nameKey: "presets.relax.name",
		defaultName: "Relaxar",
		descriptionKey: "presets.relax.description",
		defaultDescription: "Luzes a 30% em âmbar e TV desligada",
		icon: "sofa",
		lights: { on: true, brightness: 30, colors: [COLOR_AMBER] },
		televisions: { on: false },
	},
	{
		id: "dinner",
		nameKey: "presets.dinner.name",
		defaultName: "Jantar",
		descriptionKey: "presets.dinner.description",
		defaultDescription: "Luzes a 60% em branco quente",
		icon: "utensils",
		lights: { on: true, brightness: 60, colors: [COLOR_WARM_WHITE] },
	},
	{
		id: "reading",
		nameKey: "presets.reading.name",
		defaultName: "Leitura",
		descriptionKey: "presets.reading.description",
		defaultDescription: "Luzes a 100% em branco frio",
		icon: "book-open",
		lights: { on: true, brightness: 100, colors: [COLOR_COOL_WHITE] },
	},
	{
		id: "party",
		nameKey: "presets.party.name",
		defaultName: "Festa",
		descriptionKey: "presets.party.description",
		defaultDescription: "Luzes a 100% em cores vivas e TV ligada",
		icon: "party-popper",
		lights: {
			on: true,
			brightness: 100,
			colors: [COLOR_PINK, COLOR_PURPLE, COLOR_BLUE, COLOR_GREEN],
		},
		televisions: { on: true },
	},
];

const emptyAttributes = {
	brightness: null,
	colorHex: null,
	colorTempPercent: null,
} as const;

function powerItem(device: SceneDevice, on: boolean): SceneFormItem {
	return { deviceId: device.id, isOn: on, ...emptyAttributes };
}

/**
 * Monta os itens de uma predefinição para os dispositivos reais do usuário.
 * Devolve lista vazia quando nenhum dispositivo é compatível — quem chama avisa.
 */
export function buildPresetItems(
	preset: ScenePreset,
	devices: SceneDevice[],
): SceneFormItem[] {
	const items: SceneFormItem[] = [];
	const ofType = (type: number) =>
		devices.filter((device) => device.type === type);

	if (preset.lights) {
		const { on, brightness, colors } = preset.lights;

		ofType(DEVICE_TYPE_LIGHT).forEach((light, index) => {
			if (!on || !supportsLightAttributes(light)) {
				items.push(powerItem(light, on));
				return;
			}

			items.push({
				deviceId: light.id,
				isOn: true,
				brightness: brightness ?? null,
				colorHex: colors?.length
					? (colors[index % colors.length] ?? null)
					: null,
				colorTempPercent: null,
			});
		});
	}

	if (preset.televisions) {
		for (const tv of ofType(DEVICE_TYPE_TELEVISION)) {
			items.push(powerItem(tv, preset.televisions.on));
		}
	}

	if (preset.thermostats) {
		for (const thermostat of ofType(DEVICE_TYPE_THERMOSTAT)) {
			items.push(powerItem(thermostat, preset.thermostats.on));
		}
	}

	return items;
}
