import { create } from "zustand";
import type { ActivityLogEntry } from "../types/dashboard.types";

const MAX_ACTIVITY_ENTRIES = 30;

interface DashboardActivityState {
	entries: ActivityLogEntry[];
	pushEntry: (entry: Omit<ActivityLogEntry, "id" | "occurredAt">) => void;
}

export const useDashboardActivityStore = create<DashboardActivityState>(
	(set, get) => ({
		entries: [],
		pushEntry: (entry) => {
			const latest = get().entries[0];
			if (
				latest &&
				latest.title === entry.title &&
				latest.deviceId === entry.deviceId
			) {
				return;
			}

			const newEntry: ActivityLogEntry = {
				...entry,
				id: crypto.randomUUID(),
				occurredAt: new Date().toISOString(),
			};

			set((state) => ({
				entries: [newEntry, ...state.entries].slice(0, MAX_ACTIVITY_ENTRIES),
			}));
		},
	}),
);
