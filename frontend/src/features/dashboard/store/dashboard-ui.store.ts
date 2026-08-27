import { create } from "zustand";
import type { ChipKey } from "../constants/dashboard.constants";

/**
 * Interface defining the temporary UI state and actions for the Dashboard feature.
 */
interface DashboardUIState {
	// Device Type Filter Chips (client-side, filtra `devices` já carregado)
	activeChip: ChipKey;
	setActiveChip: (chip: ChipKey) => void;
}

/**
 * Zustand store managing ephemeral client-side UI state for the dashboard
 * (filtro de tipo de dispositivo) — mesmo padrão de `devices-ui.store.ts`/
 * `rooms-ui.store.ts`. Não confundir com `dashboard-preview.store.ts`, que
 * é estado persistido (overrides de preview por cômodo), não filtro.
 */
export const useDashboardUIStore = create<DashboardUIState>((set) => ({
	activeChip: "all",
	setActiveChip: (activeChip) => set({ activeChip }),
}));
