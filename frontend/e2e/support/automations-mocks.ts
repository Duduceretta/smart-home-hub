import type { Page } from "@playwright/test";

const API_ORIGIN = "http://localhost:5252";

export interface MockAutomation {
	id: string;
	name: string;
	isActive: boolean;
	isDraft: boolean;
	triggerKind: number;
	rulePayload: string;
	createdAt: string;
	updatedAt: string;
	lastExecutedAt: string | null;
	hasFailedToday: boolean;
}

export interface MockPickerDevice {
	id: string;
	name: string;
	type: number;
	isOnline: boolean;
	isOn?: boolean;
}

export const mockPickerDevices: MockPickerDevice[] = [
	{
		id: "e2e-auto-dev-1",
		name: "Lâmpada do Quarto",
		type: 1,
		isOnline: true,
		isOn: false,
	},
	{
		id: "e2e-auto-dev-2",
		name: "Sensor de Movimento",
		type: 4,
		isOnline: true,
		isOn: true,
	},
];

export async function mockAutomationsApi(
	page: Page,
	initialAutomations: MockAutomation[] = [],
): Promise<{ automations: MockAutomation[] }> {
	const state = { automations: [...initialAutomations] };
	let sequence = 0;

	// Mock devices for picker
	await page.route(`${API_ORIGIN}/api/devices*`, async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockPickerDevices),
			});
			return;
		}
		await route.fallback();
	});

	// Mock counts
	await page.route(`${API_ORIGIN}/api/automations/counts`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				total: state.automations.length,
				active: state.automations.filter((a) => a.isActive).length,
				drafts: state.automations.filter((a) => a.isDraft).length,
				failedToday: 0,
			}),
		});
	});

	// Mock history and executions
	await page.route(
		`${API_ORIGIN}/api/automations/*/history*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					items: [],
					page: 1,
					pageSize: 8,
					totalCount: 0,
				}),
			});
		},
	);

	await page.route(
		`${API_ORIGIN}/api/automations/*/executions/by-weekday*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{ dayOfWeek: 0, count: 0 },
					{ dayOfWeek: 1, count: 0 },
					{ dayOfWeek: 2, count: 0 },
					{ dayOfWeek: 3, count: 0 },
					{ dayOfWeek: 4, count: 0 },
					{ dayOfWeek: 5, count: 0 },
					{ dayOfWeek: 6, count: 0 },
				]),
			});
		},
	);

	// Mock individual automation operations (PUT, etc.)
	await page.route(`${API_ORIGIN}/api/automations/*`, async (route) => {
		const method = route.request().method();
		const url = route.request().url();

		if (
			url.includes("/counts") ||
			url.includes("/history") ||
			url.includes("/executions")
		) {
			await route.fallback();
			return;
		}

		if (method === "PUT") {
			const id = url.split("/api/automations/")[1]?.split("?")[0];
			const payload = route.request().postDataJSON() as {
				name: string;
				isActive?: boolean;
				rulePayload: string;
			};
			const auto = state.automations.find((a) => a.id === id);
			if (auto) {
				auto.name = payload.name;
				if (payload.isActive !== undefined) auto.isActive = payload.isActive;
				auto.rulePayload = payload.rulePayload;
				auto.updatedAt = new Date().toISOString();
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: auto ? auto.id : id,
					name: auto ? auto.name : payload.name,
					isActive: auto ? auto.isActive : (payload.isActive ?? true),
				}),
			});
			return;
		}

		await route.fallback();
	});

	// Mock list and create
	await page.route(`${API_ORIGIN}/api/automations*`, async (route) => {
		const method = route.request().method();
		const url = route.request().url();

		if (
			url.includes("/counts") ||
			url.includes("/history") ||
			url.includes("/executions")
		) {
			await route.fallback();
			return;
		}

		if (method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					items: state.automations,
					page: 1,
					pageSize: 20,
					totalCount: state.automations.length,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				}),
			});
			return;
		}

		if (method === "POST") {
			const payload = route.request().postDataJSON() as {
				name: string;
				isActive?: boolean;
				rulePayload: string;
			};
			sequence += 1;
			const newAuto: MockAutomation = {
				id: `e2e-auto-${sequence}`,
				name: payload.name,
				isActive: payload.isActive ?? true,
				isDraft: false,
				triggerKind: 1,
				rulePayload: payload.rulePayload,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastExecutedAt: null,
				hasFailedToday: false,
			};
			state.automations.push(newAuto);

			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					message: "Automação criada com sucesso!",
					automationId: newAuto.id,
				}),
			});
			return;
		}

		await route.fallback();
	});

	return state;
}
