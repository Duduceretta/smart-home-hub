import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DashboardPreviewState {
	/** roomKey -> ids dos dispositivos escolhidos manualmente, na ordem exibida. */
	overridesByRoom: Record<string, string[]>;
	setRoomPreview: (roomKey: string, deviceIds: string[]) => void;
	clearRoomPreview: (roomKey: string) => void;

	/** roomKey -> seção expandida/recolhida. Ausente = expandida (padrão). */
	expandedByRoom: Record<string, boolean>;
	setRoomExpanded: (roomKey: string, expanded: boolean) => void;
	setAllRoomsExpanded: (roomKeys: string[], expanded: boolean) => void;

	/** IDs das automações escolhidas manualmente para a dashboard, na ordem definida pelo usuário. */
	automationOverrides: string[] | null;
	setAutomationPreview: (automationIds: string[]) => void;
	clearAutomationPreview: () => void;
}

export const useDashboardPreviewStore = create<DashboardPreviewState>()(
	persist(
		(set) => ({
			overridesByRoom: {},
			setRoomPreview: (roomKey, deviceIds) =>
				set((state) => ({
					overridesByRoom: { ...state.overridesByRoom, [roomKey]: deviceIds },
				})),
			clearRoomPreview: (roomKey) =>
				set((state) => {
					const next = { ...state.overridesByRoom };
					delete next[roomKey];
					return { overridesByRoom: next };
				}),

			expandedByRoom: {},
			setRoomExpanded: (roomKey, expanded) =>
				set((state) => ({
					expandedByRoom: { ...state.expandedByRoom, [roomKey]: expanded },
				})),
			setAllRoomsExpanded: (roomKeys, expanded) =>
				set((state) => ({
					expandedByRoom: {
						...state.expandedByRoom,
						...Object.fromEntries(roomKeys.map((key) => [key, expanded])),
					},
				})),

			automationOverrides: null,
			setAutomationPreview: (automationIds) =>
				set({ automationOverrides: automationIds }),
			clearAutomationPreview: () => set({ automationOverrides: null }),
		}),
		{ name: "dashboard-room-preview" },
	),
);
