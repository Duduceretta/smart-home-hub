export interface DeviceGroupsListFilters {
	query?: string;
}

/**
 * Factory for deterministic TanStack Query cache keys.
 * Uses immutable const tuples for strict typing and hierarchical invalidation.
 */
export const deviceGroupsKeys = {
	all: ["device-groups"] as const,
	lists: () => [...deviceGroupsKeys.all, "list"] as const,
	list: (filters: DeviceGroupsListFilters = {}) =>
		[...deviceGroupsKeys.lists(), { filters }] as const,
	details: () => [...deviceGroupsKeys.all, "detail"] as const,
	detail: (id: string) => [...deviceGroupsKeys.details(), id] as const,
	automations: (id: string) =>
		[...deviceGroupsKeys.all, id, "automations"] as const,
	pickerDevices: () => ["device-groups", "picker-devices"] as const,
};
