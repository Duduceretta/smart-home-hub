import { describe, expect, it } from "vitest";
import {
	buildSceneBackdrop,
	buildSceneWash,
	SCENE_AFTERGLOW,
	type SceneWashItem,
} from "../scene-wash";

const item = (overrides: Partial<SceneWashItem> = {}): SceneWashItem => ({
	deviceType: 1,
	isOn: true,
	brightness: null,
	colorHex: null,
	...overrides,
});

describe("buildSceneBackdrop", () => {
	it("buildSceneBackdrop_SceneThatLightsSomething_ShouldUseTheLightWash", () => {
		const items = [item()];

		expect(buildSceneBackdrop(items)).toBe(buildSceneWash(items));
	});

	it("buildSceneBackdrop_SceneThatOnlyTurnsThingsOff_ShouldFallBackToTheAfterglow", () => {
		expect(buildSceneBackdrop([item({ isOn: false })])).toBe(SCENE_AFTERGLOW);
	});

	it("buildSceneBackdrop_NoItemsAtAll_ShouldHaveNoBackdrop", () => {
		expect(buildSceneBackdrop([])).toBe("");
	});

	it("SCENE_AFTERGLOW_ShouldOnlyUseThemeTokensNeverAFixedColor", () => {
		expect(SCENE_AFTERGLOW).toContain("var(--primary)");
		expect(SCENE_AFTERGLOW).not.toMatch(/#[0-9a-fA-F]{3,8}/);
	});
});
