import { describe, expect, it } from "vitest";
import { createSceneDeviceMock } from "@/testing/mocks/scenes.mock";
import {
	COLOR_AMBER,
	COLOR_BLUE,
	COLOR_COOL_WHITE,
	COLOR_GREEN,
	COLOR_PINK,
	COLOR_PURPLE,
	COLOR_WARM_WHITE,
} from "../../constants/scene-colors";
import { buildPresetItems, SCENE_PRESETS } from "../scene-presets";

const tuyaLight = (id: string) =>
	createSceneDeviceMock({ id, type: 1, integrationType: 8, isOn: false });
const mqttLight = (id: string) =>
	createSceneDeviceMock({ id, type: 1, integrationType: 1, isOn: false });
const tv = createSceneDeviceMock({ id: "tv", type: 8, integrationType: 4 });
const ac = createSceneDeviceMock({ id: "ac", type: 4, integrationType: 1 });
const plug = createSceneDeviceMock({ id: "plug", type: 2, integrationType: 8 });

const preset = (id: string) => {
	const found = SCENE_PRESETS.find((entry) => entry.id === id);
	if (!found) throw new Error(`preset ${id} not found`);
	return found;
};

describe("SCENE_PRESETS", () => {
	it("SCENE_PRESETS_ShouldOfferTheEightKnownRecipesWithUniqueIds", () => {
		expect(SCENE_PRESETS.map((entry) => entry.id)).toEqual([
			"good-morning",
			"arrive-home",
			"leave-home",
			"good-night",
			"relax",
			"dinner",
			"reading",
			"party",
		]);
		expect(new Set(SCENE_PRESETS.map((entry) => entry.id)).size).toBe(
			SCENE_PRESETS.length,
		);
	});

	it("SCENE_PRESETS_EveryPreset_ShouldNeverTouchSmartPlugs", () => {
		const devices = [tuyaLight("l1"), tv, ac, plug];

		for (const entry of SCENE_PRESETS) {
			const ids = buildPresetItems(entry, devices).map((item) => item.deviceId);
			expect(ids, entry.id).not.toContain("plug");
		}
	});
});

describe("buildPresetItems", () => {
	it("buildPresetItems_NoCompatibleDevice_ShouldReturnNothing", () => {
		expect(buildPresetItems(preset("relax"), [plug])).toEqual([]);
		expect(buildPresetItems(preset("relax"), [])).toEqual([]);
	});

	it("buildPresetItems_Relax_ShouldDimTuyaLightsInAmberAndTurnTheTvOff", () => {
		const items = buildPresetItems(preset("relax"), [tuyaLight("l1"), tv]);

		expect(items).toEqual([
			{
				deviceId: "l1",
				isOn: true,
				brightness: 30,
				colorHex: COLOR_AMBER,
				colorTempPercent: null,
			},
			{
				deviceId: "tv",
				isOn: false,
				brightness: null,
				colorHex: null,
				colorTempPercent: null,
			},
		]);
	});

	it("buildPresetItems_LightWithoutTuyaLocalControl_ShouldOnlyTurnItOnWithoutAttributes", () => {
		const [item] = buildPresetItems(preset("relax"), [mqttLight("l1")]);

		expect(item).toEqual({
			deviceId: "l1",
			isOn: true,
			brightness: null,
			colorHex: null,
			colorTempPercent: null,
		});
	});

	it("buildPresetItems_LeaveHome_ShouldTurnLightsTvAndThermostatOff", () => {
		const items = buildPresetItems(preset("leave-home"), [
			tuyaLight("l1"),
			tv,
			ac,
			plug,
		]);

		expect(items.map((item) => [item.deviceId, item.isOn])).toEqual([
			["l1", false],
			["tv", false],
			["ac", false],
		]);
		expect(items.every((item) => item.brightness === null)).toBe(true);
	});

	it("buildPresetItems_GoodNight_ShouldLeaveTheThermostatAlone", () => {
		const items = buildPresetItems(preset("good-night"), [
			tuyaLight("l1"),
			tv,
			ac,
		]);

		expect(items.map((item) => item.deviceId)).toEqual(["l1", "tv"]);
	});

	it("buildPresetItems_ArriveHome_ShouldTurnLightsOnInWarmWhiteAndTheThermostatOn", () => {
		const items = buildPresetItems(preset("arrive-home"), [
			tuyaLight("l1"),
			ac,
		]);

		expect(items[0]).toMatchObject({
			deviceId: "l1",
			isOn: true,
			brightness: 70,
			colorHex: COLOR_WARM_WHITE,
		});
		expect(items[1]).toMatchObject({ deviceId: "ac", isOn: true });
	});

	it("buildPresetItems_GoodMorning_ShouldUseWarmWhiteAt80Percent", () => {
		const [item] = buildPresetItems(preset("good-morning"), [tuyaLight("l1")]);

		expect(item).toMatchObject({ brightness: 80, colorHex: COLOR_WARM_WHITE });
	});

	it("buildPresetItems_Reading_ShouldUseCoolWhiteAtFullBrightness", () => {
		const [item] = buildPresetItems(preset("reading"), [tuyaLight("l1")]);

		expect(item).toMatchObject({ brightness: 100, colorHex: COLOR_COOL_WHITE });
	});

	it("buildPresetItems_Party_ShouldCycleVividColorsAcrossLightsAndTurnTheTvOn", () => {
		const lights = ["a", "b", "c", "d", "e"].map(tuyaLight);

		const items = buildPresetItems(preset("party"), [...lights, tv]);

		expect(items.slice(0, 5).map((item) => item.colorHex)).toEqual([
			COLOR_PINK,
			COLOR_PURPLE,
			COLOR_BLUE,
			COLOR_GREEN,
			COLOR_PINK,
		]);
		expect(items[5]).toMatchObject({ deviceId: "tv", isOn: true });
	});
});
