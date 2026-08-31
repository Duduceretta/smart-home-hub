import type { HistoryEvent } from "@/features/history/types/history.types";

/**
 * Factory for creating mock HistoryEvent objects for unit and integration testing.
 */
export function createHistoryEventMock(
	overrides: Partial<HistoryEvent> = {},
): HistoryEvent {
	return {
		id: "hist-0000-0000-0000-000000000001",
		timestampUtc: new Date().toISOString(),
		eventType: "StateChange",
		description: "Lâmpada ligada via automação",
		deviceId: "dev-0000-0000-0000-000000000001",
		deviceName: "Lâmpada Sala",
		roomId: "room-0000-0000-0000-000000000001",
		roomName: "Sala de Estar",
		deviceGroupId: null,
		deviceGroupName: null,
		source: "Automation",
		severity: "Info",
		oldValue: "off",
		newValue: "on",
		...overrides,
	};
}
