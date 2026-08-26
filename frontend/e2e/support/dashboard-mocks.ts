import type { Page } from "@playwright/test";
import { mockFirebaseAuth, testUser } from "./auth-mocks";

/**
 * Backend origin (matches VITE_API_URL's local fallback in api.client.ts).
 * Route patterns MUST be anchored to this origin — see devices-mocks.ts for
 * why a bare "**" wildcard is dangerous with Vite-served module paths.
 */
const API_ORIGIN = "http://localhost:5252";

export interface MockEnergyChartPoint {
	timestamp: string;
	value: number;
	isEstimated: boolean;
}

export interface MockRoomEnergyUsage {
	roomId: string | null;
	value: number;
	isEstimated: boolean;
}

export interface MockDashboardOverview {
	summary: {
		totalDevicesCount: number;
		onlineDevicesCount: number;
		energyConsumptionKwh: number;
		isEnergyEstimated: boolean;
		averageTemperatureCelsius: number;
		temperatureTrend: number;
		activeAlertsCount: number;
	};
	energyChart: MockEnergyChartPoint[];
	roomUsage: MockRoomEnergyUsage[];
	recentActivities: [];
}

export function emptyDashboardOverview(): MockDashboardOverview {
	return {
		summary: {
			totalDevicesCount: 0,
			onlineDevicesCount: 0,
			energyConsumptionKwh: 0,
			isEnergyEstimated: false,
			averageTemperatureCelsius: 0,
			temperatureTrend: 0,
			activeAlertsCount: 0,
		},
		energyChart: [],
		roomUsage: [],
		recentActivities: [],
	};
}

/** Intercepts GET /api/dashboard/overview with a fixed, deterministic payload. */
export async function mockDashboardOverviewApi(
	page: Page,
	overview: MockDashboardOverview = emptyDashboardOverview(),
	status = 200,
): Promise<void> {
	await page.route(`${API_ORIGIN}/api/dashboard/overview*`, async (route) => {
		if (status !== 200) {
			await route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify({ title: "Erro Interno do Servidor" }),
			});
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(overview),
		});
	});
}

export interface MockActivityLogEntry {
	id: string;
	deviceId: string | null;
	eventType: "DeviceStatus" | "DeviceMedia" | "Spotify";
	title: string;
	description: string;
	timestamp: string;
}

/** Intercepts GET /api/dashboard/activity-log with a fixed page of entries. */
export async function mockActivityLogApi(
	page: Page,
	items: MockActivityLogEntry[] = [],
): Promise<void> {
	await page.route(
		`${API_ORIGIN}/api/dashboard/activity-log*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					items,
					page: 1,
					pageSize: 5,
					totalCount: items.length,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				}),
			});
		},
	);
}

/** Intercepts GET /api/integrations/spotify/status as disconnected — the dashboard sidebar always fetches this. */
export async function mockSpotifyDisconnected(page: Page): Promise<void> {
	await page.route(
		`${API_ORIGIN}/api/integrations/spotify/status*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ connected: false, displayName: null }),
			});
		},
	);
}

/**
 * Bundles every network mock the Dashboard page needs to render fully,
 * beyond what mockRoomsApi/mockDevicesApi already cover.
 */
export async function mockDashboardEssentials(
	page: Page,
	overview: MockDashboardOverview = emptyDashboardOverview(),
	activityLogItems: MockActivityLogEntry[] = [],
): Promise<void> {
	await mockDashboardOverviewApi(page, overview);
	await mockActivityLogApi(page, activityLogItems);
	await mockSpotifyDisconnected(page);
}

/**
 * Logs in through the real login form against mocked Firebase, landing on
 * /dashboard. Deliberately does NOT reuse auth-mocks.ts's
 * mockBackendEssentials — that helper stubs /api/dashboard/overview with a
 * fixed empty payload, and Playwright resolves overlapping page.route
 * handlers most-recently-registered-first, so calling it would always win
 * over a richer overview mock registered earlier in the same test. Callers
 * must register mockDashboardEssentials/mockRoomsApi/mockDevicesApi
 * themselves before calling this.
 */
export async function loginAndGoToDashboard(page: Page): Promise<void> {
	await mockFirebaseAuth(page, "success");

	await page.route(`${API_ORIGIN}/api/users/sync`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ message: "Usuário sincronizado com sucesso." }),
		});
	});

	await page.goto("/login");
	await page.getByLabel("Email").fill(testUser.email);
	await page.getByLabel("Senha", { exact: true }).fill("SenhaValida123!");
	await page.getByRole("button", { name: "Iniciar Sessão" }).click();

	await page.waitForURL(/\/dashboard/);
}
