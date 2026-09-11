import { beforeEach, describe, expect, it } from "vitest";
import { useAuthIllustrationUIStore } from "../auth-illustration-ui.store";

describe("auth-illustration-ui.store Unit Tests", () => {
	beforeEach(() => {
		useAuthIllustrationUIStore.getState().resetLamps();
	});

	it("initialState_ShouldMatchDefaultLampStates", () => {
		const state = useAuthIllustrationUIStore.getState();
		expect(state.isLivingLampOn).toBe(false);
		expect(state.isBedroomLampOn).toBe(true);
		expect(state.isOfficeLampOn).toBe(true);
	});

	it("toggleActions_ShouldInvertEachLampIndependently", () => {
		const store = useAuthIllustrationUIStore.getState();

		store.toggleLivingLamp();
		expect(useAuthIllustrationUIStore.getState().isLivingLampOn).toBe(true);

		store.toggleBedroomLamp();
		expect(useAuthIllustrationUIStore.getState().isBedroomLampOn).toBe(false);

		store.toggleOfficeLamp();
		expect(useAuthIllustrationUIStore.getState().isOfficeLampOn).toBe(false);

		// Toggle back
		store.toggleLivingLamp();
		expect(useAuthIllustrationUIStore.getState().isLivingLampOn).toBe(false);
	});

	it("setAndResetActions_ShouldSetExplicitValuesAndResetToDefaults", () => {
		const store = useAuthIllustrationUIStore.getState();

		store.setLivingLamp(true);
		store.setBedroomLamp(false);
		store.setOfficeLamp(false);

		expect(useAuthIllustrationUIStore.getState().isLivingLampOn).toBe(true);
		expect(useAuthIllustrationUIStore.getState().isBedroomLampOn).toBe(false);
		expect(useAuthIllustrationUIStore.getState().isOfficeLampOn).toBe(false);

		store.resetLamps();

		expect(useAuthIllustrationUIStore.getState().isLivingLampOn).toBe(false);
		expect(useAuthIllustrationUIStore.getState().isBedroomLampOn).toBe(true);
		expect(useAuthIllustrationUIStore.getState().isOfficeLampOn).toBe(true);
	});
});
