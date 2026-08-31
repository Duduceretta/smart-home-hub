import type { HistoryEvent } from "../types/history.types";

/**
 * Downloads a collection of historical events as formatted JSON.
 */
export function exportEventsAsJson(events: HistoryEvent[], filename?: string) {
	const dataStr =
		"data:text/json;charset=utf-8," +
		encodeURIComponent(JSON.stringify(events, null, 2));
	const downloadAnchor = document.createElement("a");
	const name =
		filename || `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
	downloadAnchor.setAttribute("href", dataStr);
	downloadAnchor.setAttribute("download", name);
	document.body.appendChild(downloadAnchor);
	downloadAnchor.click();
	downloadAnchor.remove();
}

/**
 * Downloads a collection of historical events as CSV.
 */
export function exportEventsAsCsv(events: HistoryEvent[], filename?: string) {
	const headers = [
		"ID",
		"Timestamp (UTC)",
		"EventType",
		"Description",
		"Source",
		"Severity",
		"Device",
		"Room",
		"DeviceGroup",
		"OldValue",
		"NewValue",
	];

	const rows = events.map((e) => [
		e.id,
		e.timestampUtc,
		e.eventType,
		`"${(e.description || "").replace(/"/g, '""')}"`,
		e.source,
		e.severity,
		`"${(e.deviceName || "").replace(/"/g, '""')}"`,
		`"${(e.roomName || "").replace(/"/g, '""')}"`,
		`"${(e.deviceGroupName || "").replace(/"/g, '""')}"`,
		`"${(e.oldValue || "").replace(/"/g, '""')}"`,
		`"${(e.newValue || "").replace(/"/g, '""')}"`,
	]);

	const csvContent =
		"data:text/csv;charset=utf-8," +
		[headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

	const encodedUri = encodeURI(csvContent);
	const downloadAnchor = document.createElement("a");
	const name =
		filename || `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
	downloadAnchor.setAttribute("href", encodedUri);
	downloadAnchor.setAttribute("download", name);
	document.body.appendChild(downloadAnchor);
	downloadAnchor.click();
	downloadAnchor.remove();
}
