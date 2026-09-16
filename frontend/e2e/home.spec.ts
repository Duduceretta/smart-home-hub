import path from "node:path";
import { expect, test } from "@playwright/test";
import { mockFirebaseAuth, testUser } from "./support/auth-mocks";
import {
	type MockActivityLogEntry,
	type MockDashboardOverview,
	mockActivityLogApi,
	mockDashboardOverviewApi,
	mockSpotifyDisconnected,
} from "./support/dashboard-mocks";
import {
	type MockDevice,
	mockDevicesApi,
	mockRoom,
	mockRoomsApi,
} from "./support/devices-mocks";

const API_ORIGIN = "http://localhost:5252";

const mockDevices: MockDevice[] = [
	{
		id: "e2e-home-lamp-1",
		name: "Lâmpada da Sala",
		brand: "Philips Hue",
		externalId: "AA:BB:CC:DD:EE:01",
		ipAddress: null,
		type: 1, // Light
		category: "Iluminação",
		room: "Sala de Estar",
		roomId: mockRoom.id,
		isOnline: true,
		isOn: true,
		lastActivityMinutes: 2,
	},
	{
		id: "e2e-home-thermostat",
		name: "Climatização",
		brand: "Daikin",
		externalId: "AA:BB:CC:DD:EE:02",
		ipAddress: null,
		type: 4, // Thermostat
		category: "Climatização",
		room: "Sala de Estar",
		roomId: mockRoom.id,
		isOnline: true,
		isOn: true,
		lastActivityMinutes: 10,
	},
	{
		id: "e2e-home-lock",
		name: "Fechadura Principal",
		brand: "Yale",
		externalId: "AA:BB:CC:DD:EE:03",
		ipAddress: null,
		type: 6, // Lock
		category: "Segurança",
		room: "Entrada",
		roomId: null,
		isOnline: true,
		isOn: true,
		lastActivityMinutes: 30,
	},
	{
		id: "e2e-home-sensor",
		name: "Sensor de Presença",
		brand: "Aqara",
		externalId: "AA:BB:CC:DD:EE:04",
		ipAddress: null,
		type: 3, // Sensor
		category: "Sensores",
		room: "Corredor",
		roomId: null,
		isOnline: true,
		isOn: false,
		lastActivityMinutes: 1,
	},
	{
		id: "e2e-home-tv",
		name: "Smart TV OLED",
		brand: "LG",
		externalId: "AA:BB:CC:DD:EE:05",
		ipAddress: null,
		type: 8, // Television
		category: "Multimídia",
		room: "Sala de Estar",
		roomId: mockRoom.id,
		isOnline: true,
		isOn: false,
		lastActivityMinutes: 45,
	},
	{
		id: "e2e-home-lamp-bedroom",
		name: "Plafon Quarto",
		brand: "Yeelight",
		externalId: "AA:BB:CC:DD:EE:06",
		ipAddress: null,
		type: 1, // Light
		category: "Iluminação",
		room: "Quarto Principal",
		roomId: null,
		isOnline: true,
		isOn: false,
		lastActivityMinutes: 120,
	},
];

const mockOverview: MockDashboardOverview = {
	summary: {
		totalDevicesCount: 6,
		onlineDevicesCount: 6,
		energyConsumptionKwh: 2.4,
		isEnergyEstimated: false,
		averageTemperatureCelsius: 22.8,
		temperatureTrend: 0.4,
		activeAlertsCount: 0,
	},
	energyChart: [],
	roomUsage: [],
	recentActivities: [],
};

const mockActivities: MockActivityLogEntry[] = [
	{
		id: "act-1",
		title: "Automação Modo Cinema executada",
		description: "Luzes da sala dimerizadas e TV iniciada",
		timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		isAlert: false,
	},
	{
		id: "act-2",
		title: "Fechadura Principal trancada",
		description: "Bloqueio automático ativado por sensor",
		timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
		isAlert: false,
	},
	{
		id: "act-3",
		title: "Climatização ajustada para 22.8°C",
		description: "Temperatura estabilizada na residência",
		timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
		isAlert: false,
	},
];

async function setupAndLogin(page: import("@playwright/test").Page) {
	await mockFirebaseAuth(page, "success");
	await mockRoomsApi(page);
	await mockDevicesApi(page, mockDevices);
	await mockDashboardOverviewApi(page, mockOverview);
	await mockActivityLogApi(page, mockActivities);
	await mockSpotifyDisconnected(page);

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

	await page.goto("/home");
	await page.waitForURL(/\/home/);
}

test.describe("E2E: Home Page (Mobile-First & Bento Grid)", () => {
	test("HomePage_Desktop_ShouldRenderBentoGridAndCaptureScreenshot", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 860 });
		await setupAndLogin(page);

		// Valida elementos do Bento Grid no Desktop
		await expect(
			page.getByRole("heading", { name: "Nexus Hub" }),
		).toBeVisible();
		await expect(page.getByText("Visão Geral da Casa")).toBeVisible();
		await expect(page.getByText("22.8°C")).toBeVisible();
		await expect(page.getByText("Cenas & Ações Rápidas")).toBeVisible();
		await expect(page.getByText("Dispositivos")).toBeVisible();
		await expect(page.getByText("Atividade recente")).toBeVisible();

		// Captura screenshot Desktop
		const screenshotPath = path.resolve(
			process.cwd(),
			"../screenshots/home-desktop.png",
		);
		await page.screenshot({ path: screenshotPath, fullPage: true });
	});

	test("HomePage_Mobile_ShouldRenderTouchFirstCardsAndCaptureScreenshot", async ({
		page,
	}) => {
		// Viewport mobile padrão (iPhone 14 / modern smartphone)
		await page.setViewportSize({ width: 390, height: 844 });
		await setupAndLogin(page);

		// Valida elementos no Mobile
		await expect(
			page.getByRole("heading", { name: "Nexus Hub" }),
		).toBeVisible();
		await expect(page.getByText("Lâmpada da Sala")).toBeVisible();
		await expect(page.getByText("Fechadura Principal")).toBeVisible();

		// Captura screenshot Mobile
		const screenshotPath = path.resolve(
			process.cwd(),
			"../screenshots/home-mobile.png",
		);
		await page.screenshot({ path: screenshotPath, fullPage: true });
	});
});
