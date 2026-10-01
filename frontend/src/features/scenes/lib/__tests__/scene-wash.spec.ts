import { describe, expect, it } from "vitest";
import { buildSceneWash, type SceneWashItem } from "../scene-wash";

// Cores de dado do usuário (`colorHex` da luz), não tokens de design.
const AMBER = "#FFAA00"; // design-token-lint-ignore
const RED = "#FF0000"; // design-token-lint-ignore
const GREEN = "#00FF00"; // design-token-lint-ignore
const BLUE = "#0000FF"; // design-token-lint-ignore
const YELLOW = "#FFFF00"; // design-token-lint-ignore
const MAGENTA = "#FF00FF"; // design-token-lint-ignore

const LIGHT = 1;
const SWITCH = 2;

const item = (overrides: Partial<SceneWashItem> = {}): SceneWashItem => ({
	deviceType: LIGHT,
	isOn: true,
	brightness: null,
	colorHex: null,
	...overrides,
});

const layerCount = (wash: string) => wash.split("radial-gradient(").length - 1;

describe("buildSceneWash", () => {
	it("buildSceneWash_EveryDeviceTurnsOff_ShouldReturnNoWash", () => {
		expect(buildSceneWash([item({ isOn: false })])).toBe("");
		expect(buildSceneWash([])).toBe("");
	});

	it("buildSceneWash_LightWithItsOwnColor_ShouldUseThatColor", () => {
		const wash = buildSceneWash([item({ colorHex: AMBER })]);

		expect(wash).toContain(AMBER);
		expect(wash).not.toContain("var(--warm)");
	});

	it("buildSceneWash_LightWithoutColor_ShouldFallBackToTheWarmThemeToken", () => {
		expect(buildSceneWash([item()])).toContain("var(--warm)");
	});

	it("buildSceneWash_NonLightThatTurnsOn_ShouldUseThePrimaryThemeToken", () => {
		const wash = buildSceneWash([item({ deviceType: SWITCH })]);

		expect(wash).toContain("var(--primary)");
		expect(wash).not.toContain("var(--warm)");
	});

	it("buildSceneWash_DeviceThatTurnsOff_ShouldNotContributeColor", () => {
		const wash = buildSceneWash([
			item({ colorHex: RED, isOn: false }),
			item({ colorHex: GREEN }),
		]);

		expect(wash).toContain(GREEN);
		expect(wash).not.toContain(RED);
	});

	it("buildSceneWash_SameColorOnSeveralDevices_ShouldRenderASingleLayer", () => {
		const wash = buildSceneWash([
			item({ colorHex: AMBER }),
			item({ colorHex: AMBER }),
			item({ colorHex: AMBER }),
		]);

		expect(layerCount(wash)).toBe(1);
	});

	it("buildSceneWash_ManyDistinctColors_ShouldCapAtThreeLayers", () => {
		const wash = buildSceneWash([
			item({ colorHex: RED }),
			item({ colorHex: GREEN }),
			item({ colorHex: BLUE }),
			item({ colorHex: YELLOW }),
			item({ colorHex: MAGENTA }),
		]);

		expect(layerCount(wash)).toBe(3);
	});

	it("buildSceneWash_DimmerLight_ShouldProduceAWeakerGlowThanABrightOne", () => {
		const percentOf = (wash: string) =>
			Number(/(\d+)%, transparent\)/.exec(wash)?.[1]);

		const dim = percentOf(buildSceneWash([item({ brightness: 5 })]));
		const bright = percentOf(buildSceneWash([item({ brightness: 100 })]));

		expect(dim).toBeLessThan(bright);
	});

	it("buildSceneWash_ColoredLightsComeBeforePlainOnes_ShouldKeepTheMostExpressiveColorsWhenCapped", () => {
		const wash = buildSceneWash([
			item({ deviceType: SWITCH }),
			item({ colorHex: RED }),
			item({ colorHex: GREEN }),
			item({ colorHex: BLUE }),
		]);

		expect(wash).toContain(RED);
		expect(wash).toContain(GREEN);
		expect(wash).toContain(BLUE);
		expect(wash).not.toContain("var(--primary)");
	});
});
