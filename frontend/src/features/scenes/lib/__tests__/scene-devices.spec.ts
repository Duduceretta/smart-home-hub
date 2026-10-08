import { describe, expect, it } from "vitest";
import {
	isSceneEligibleDevice,
	supportsLightAttributes,
} from "../scene-devices";

describe("scene-devices", () => {
	describe("isSceneEligibleDevice", () => {
		it.each([
			[1, "Light"],
			[2, "Switch"],
			[4, "Thermostat"],
			[8, "Television"],
		])(
			"isSceneEligibleDevice_ControllableType%i_ShouldBeEligible (%s)",
			(type) => {
				expect(isSceneEligibleDevice({ type })).toBe(true);
			},
		);

		it.each([
			[3, "Sensor"],
			[5, "Camera"],
			[6, "Lock"],
			[7, "Alarm"],
		])(
			"isSceneEligibleDevice_NonSceneType%i_ShouldNotBeEligible (%s)",
			(type) => {
				expect(isSceneEligibleDevice({ type })).toBe(false);
			},
		);
	});

	describe("supportsLightAttributes", () => {
		it("supportsLightAttributes_TuyaLocalLight_ShouldBeTrue", () => {
			expect(supportsLightAttributes({ type: 1, integrationType: 8 })).toBe(
				true,
			);
		});

		it("supportsLightAttributes_LightOnAnotherIntegration_ShouldBeFalse", () => {
			expect(supportsLightAttributes({ type: 1, integrationType: 1 })).toBe(
				false,
			);
		});

		it("supportsLightAttributes_TuyaLocalSwitch_ShouldBeFalse", () => {
			expect(supportsLightAttributes({ type: 2, integrationType: 8 })).toBe(
				false,
			);
		});
	});
});
