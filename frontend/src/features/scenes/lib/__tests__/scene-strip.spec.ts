import { describe, expect, it } from "vitest";
import { COLOR_AMBER, COLOR_BLUE } from "../../constants/scene-colors";
import { buildSceneStrip, type SceneWashItem } from "../scene-wash";

const item = (overrides: Partial<SceneWashItem> = {}): SceneWashItem => ({
	deviceType: 1,
	isOn: true,
	brightness: null,
	colorHex: null,
	...overrides,
});

describe("buildSceneStrip", () => {
	it("buildSceneStrip_NothingTurnsOn_ShouldReturnNoStrip", () => {
		expect(buildSceneStrip([item({ isOn: false })])).toBe("");
		expect(buildSceneStrip([])).toBe("");
	});

	it("buildSceneStrip_SingleColor_ShouldStillProduceAValidTwoStopGradient", () => {
		const strip = buildSceneStrip([item({ colorHex: COLOR_AMBER })]);

		expect(strip.startsWith("linear-gradient(90deg,")).toBe(true);
		expect(strip.split(COLOR_AMBER).length - 1).toBe(2);
	});

	it("buildSceneStrip_SeveralColors_ShouldListEachOnceInOrder", () => {
		const strip = buildSceneStrip([
			item({ colorHex: COLOR_AMBER }),
			item({ colorHex: COLOR_BLUE }),
		]);

		expect(strip.indexOf(COLOR_AMBER)).toBeGreaterThan(-1);
		expect(strip.indexOf(COLOR_BLUE)).toBeGreaterThan(
			strip.indexOf(COLOR_AMBER),
		);
	});

	it("buildSceneStrip_LightWithoutColor_ShouldUseTheWarmThemeToken", () => {
		expect(buildSceneStrip([item()])).toContain("var(--warm)");
	});

	it("buildSceneStrip_NonLightThatTurnsOn_ShouldUseThePrimaryThemeToken", () => {
		expect(buildSceneStrip([item({ deviceType: 2 })])).toContain(
			"var(--primary)",
		);
	});
});
