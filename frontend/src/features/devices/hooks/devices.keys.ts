import type { StatusFilterType } from "../types/devices.types";

/**
 * Interface representing the supported filtering options for device query keys.
 * Enables strictly typed cache keys and parameter validation.
 */
export interface DevicesListFilters {
	query?: string;
	category?: string;
	status?: StatusFilterType;
}

/**
 * Factory for deterministic TanStack Query cache keys.
 * Uses immutable const tuples for strict typing and hierarchical invalidation.
 */
export const devicesKeys = {
	all: ["devices"] as const,
	lists: () => [...devicesKeys.all, "list"] as const,
	list: (filters: Record<string, unknown> = {}) =>
		[...devicesKeys.lists(), { filters }] as const,
	details: () => [...devicesKeys.all, "detail"] as const,
	detail: (id: string) => [...devicesKeys.details(), id] as const,
	telemetries: () => [...devicesKeys.all, "telemetry"] as const,
	telemetry: (id: string, range = "24h") =>
		[...devicesKeys.telemetries(), id, { range }] as const,
};
