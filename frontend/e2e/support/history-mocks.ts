import type { Page } from "@playwright/test";

const API_ORIGIN = "http://localhost:5252";

export interface MockHistoryEvent {
	id: string;
	timestampUtc: string;
	eventType: string;
	description: string;
	deviceId?: string | null;
	deviceName?: string | null;
	roomId?: string | null;
	roomName?: string | null;
	deviceGroupId?: string | null;
	deviceGroupName?: string | null;
	source: "Automation" | "UserManual" | "System" | "DeviceGroup" | string;
	severity: "Info" | "Warning" | "Error" | "Critical" | string;
	oldValue?: string | null;
	newValue?: string | null;
}

export const mockDefaultHistoryEvents: MockHistoryEvent[] = [
	{
		id: "hist-01",
		timestampUtc: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
		eventType: "DeviceStateChanged",
		description: "Lâmpada da Sala foi ligada manualmente",
		deviceId: "dev-01",
		deviceName: "Lâmpada da Sala",
		roomId: "room-01",
		roomName: "Sala de Estar",
		source: "UserManual",
		severity: "Info",
		oldValue: "off",
		newValue: "on",
	},
	{
		id: "hist-02",
		timestampUtc: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
		eventType: "AutomationTriggered",
		description: "Automação 'Ar-condicionado Noite' executada com sucesso",
		deviceId: "dev-02",
		deviceName: "Termostato Quarto",
		roomId: "room-02",
		roomName: "Quarto Principal",
		source: "Automation",
		severity: "Info",
		oldValue: "24",
		newValue: "21",
	},
	{
		id: "hist-03",
		timestampUtc: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
		eventType: "DeviceWarning",
		description: "Sensor de Umidade com bateria baixa",
		deviceId: "dev-03",
		deviceName: "Sensor Banheiro",
		roomId: "room-03",
		roomName: "Banheiro",
		source: "System",
		severity: "Warning",
		oldValue: "15%",
		newValue: "9%",
	},
	{
		id: "hist-04",
		timestampUtc: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
		eventType: "SystemError",
		description: "Falha de comunicação com Gateway Zigbee",
		deviceId: null,
		deviceName: null,
		roomId: null,
		roomName: null,
		source: "System",
		severity: "Error",
		oldValue: null,
		newValue: null,
	},
];

export async function mockHistoryApi(
	page: Page,
	initialEvents: MockHistoryEvent[] = mockDefaultHistoryEvents,
): Promise<{ events: MockHistoryEvent[] }> {
	const state = { events: [...initialEvents] };

	await page.route(`${API_ORIGIN}/api/history/stats*`, async (route) => {
		const url = new URL(route.request().url());
		const search = url.searchParams.get("search")?.toLowerCase();
		const severity = url.searchParams.get("severity");
		const source = url.searchParams.get("source");

		let filtered = state.events;
		if (search) {
			filtered = filtered.filter(
				(e) =>
					e.description.toLowerCase().includes(search) ||
					e.deviceName?.toLowerCase().includes(search) ||
					e.roomName?.toLowerCase().includes(search),
			);
		}
		if (severity && severity !== "all") {
			filtered = filtered.filter(
				(e) => e.severity.toLowerCase() === severity.toLowerCase(),
			);
		}
		if (source && source !== "all") {
			filtered = filtered.filter(
				(e) => e.source.toLowerCase() === source.toLowerCase(),
			);
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				totalEvents: filtered.length,
				automationCount: filtered.filter((e) => e.source === "Automation")
					.length,
				alertCount: filtered.filter(
					(e) => e.severity === "Error" || e.severity === "Critical",
				).length,
				groupActionCount: filtered.filter((e) => e.source === "DeviceGroup")
					.length,
			}),
		});
	});

	await page.route(`${API_ORIGIN}/api/history*`, async (route) => {
		const requestUrl = route.request().url();
		if (requestUrl.includes("/api/history/stats")) {
			await route.fallback();
			return;
		}

		const url = new URL(requestUrl);
		const search = url.searchParams.get("search")?.toLowerCase();
		const severity = url.searchParams.get("severity");
		const source = url.searchParams.get("source");
		const pageNum = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);

		let filtered = state.events;
		if (search) {
			filtered = filtered.filter(
				(e) =>
					e.description.toLowerCase().includes(search) ||
					e.deviceName?.toLowerCase().includes(search) ||
					e.roomName?.toLowerCase().includes(search),
			);
		}
		if (severity && severity !== "all") {
			filtered = filtered.filter(
				(e) => e.severity.toLowerCase() === severity.toLowerCase(),
			);
		}
		if (source && source !== "all") {
			filtered = filtered.filter(
				(e) => e.source.toLowerCase() === source.toLowerCase(),
			);
		}

		const startIndex = (pageNum - 1) * pageSize;
		const paginated = filtered.slice(startIndex, startIndex + pageSize);
		const totalPages = Math.ceil(filtered.length / pageSize) || 1;

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				items: paginated,
				page: pageNum,
				pageSize,
				totalCount: filtered.length,
				totalPages,
				hasNextPage: pageNum < totalPages,
				hasPreviousPage: pageNum > 1,
			}),
		});
	});

	return state;
}
