import { create } from "zustand";

export interface AuthIllustrationUIState {
	isLivingLampOn: boolean;
	isBedroomLampOn: boolean;
	isOfficeLampOn: boolean;
	toggleLivingLamp: () => void;
	toggleBedroomLamp: () => void;
	toggleOfficeLamp: () => void;
	setLivingLamp: (on: boolean) => void;
	setBedroomLamp: (on: boolean) => void;
	setOfficeLamp: (on: boolean) => void;
	resetLamps: () => void;
}

const DEFAULT_LAMP_STATES = {
	isLivingLampOn: false,
	isBedroomLampOn: true,
	isOfficeLampOn: true,
};

export const useAuthIllustrationUIStore = create<AuthIllustrationUIState>(
	(set) => ({
		...DEFAULT_LAMP_STATES,
		toggleLivingLamp: () =>
			set((state) => ({ isLivingLampOn: !state.isLivingLampOn })),
		toggleBedroomLamp: () =>
			set((state) => ({ isBedroomLampOn: !state.isBedroomLampOn })),
		toggleOfficeLamp: () =>
			set((state) => ({ isOfficeLampOn: !state.isOfficeLampOn })),
		setLivingLamp: (on: boolean) => set({ isLivingLampOn: on }),
		setBedroomLamp: (on: boolean) => set({ isBedroomLampOn: on }),
		setOfficeLamp: (on: boolean) => set({ isOfficeLampOn: on }),
		resetLamps: () => set(DEFAULT_LAMP_STATES),
	}),
);
