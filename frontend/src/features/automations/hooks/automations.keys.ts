export interface AutomationsListFilters {
	query?: string;
}

/**
 * Factory for deterministic TanStack Query cache keys.
 * Uses immutable const tuples for strict typing and hierarchical invalidation.
 */
export const automationsKeys = {
	all: ["automations"] as const,
	lists: () => [...automationsKeys.all, "list"] as const,
	list: (filters: AutomationsListFilters = {}) =>
		[...automationsKeys.lists(), { filters }] as const,
	details: () => [...automationsKeys.all, "detail"] as const,
	detail: (id: string) => [...automationsKeys.details(), id] as const,
	pickerDevices: () => [...automationsKeys.all, "picker-devices"] as const,
	executionHistories: () =>
		[...automationsKeys.all, "execution-history"] as const,
	executionHistory: (id: string, page: number, pageSize: number) =>
		[...automationsKeys.executionHistories(), id, { page, pageSize }] as const,
	weekdayExecutions: (id: string, sinceDays: number) =>
		[...automationsKeys.all, "weekday-executions", id, sinceDays] as const,
};
