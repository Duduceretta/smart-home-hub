import type { StatusFilterType } from "../types/devices.types";

/**
 * Interface representing the supported filtering options for device query keys.
 * Enables strictly typed cache keys and parameter validation.
 */
export interface DevicesListFilters {
	query?: string;
	category?: string;
	status?: StatusFilterType;
	roomId?: string | null;
	onlyOn?: boolean;
	page?: number;
	pageSize?: number;
}

/**
 * Factory for deterministic TanStack Query cache keys.
 * Uses immutable const tuples for strict typing and hierarchical invalidation.
 */
export const devicesKeys = {
	all: ["devices"] as const,
	lists: () => [...devicesKeys.all, "list"] as const,
	list: (filters: DevicesListFilters = {}) =>
		[...devicesKeys.lists(), { filters }] as const,
	details: () => [...devicesKeys.all, "detail"] as const,
	detail: (id: string) => [...devicesKeys.details(), id] as const,
	telemetries: () => [...devicesKeys.all, "telemetry"] as const,
	telemetry: (id: string, range = "24h") =>
		[...devicesKeys.telemetries(), id, { range }] as const,
	medias: () => [...devicesKeys.all, "media"] as const,
	media: (id: string) => [...devicesKeys.medias(), id] as const,
	energies: () => [...devicesKeys.all, "energy"] as const,
	energy: (id: string, range: string) =>
		[...devicesKeys.energies(), id, { range }] as const,
	linkedAutomations: () => [...devicesKeys.all, "linked-automations"] as const,
	linkedAutomationsFor: (id: string) =>
		[...devicesKeys.linkedAutomations(), id] as const,
	activityLogs: () => [...devicesKeys.all, "activity-log"] as const,
	activityLog: (id: string) => [...devicesKeys.activityLogs(), id] as const,
	workModes: () => [...devicesKeys.all, "work-mode"] as const,
	workMode: (id: string) => [...devicesKeys.workModes(), id] as const,
};
