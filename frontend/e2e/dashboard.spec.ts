import { expect, test } from "@playwright/test";
import {
	emptyDashboardOverview,
	loginAndGoToDashboard,
	type MockActivityLogEntry,
	type MockDashboardOverview,
	mockActivityLogApi,
	mockDashboardEssentials,
	mockDashboardOverviewApi,
	mockSpotifyDisconnected,
} from "./support/dashboard-mocks";
import {
	type MockDevice,
	mockDevicesApi,
	mockRoom,
	mockRoomsApi,
} from "./support/devices-mocks";

const lamp: MockDevice = {
	id: "e2e-dashboard-lamp",
	name: "Lâmpada da Sala",
	brand: "Philips Hue",
	externalId: "AA:BB:CC:DD:EE:01",
	ipAddress: null,
	type: 1, // Light
	category: "Iluminação",
	room: mockRoom.name,
	roomId: mockRoom.id,
	isOnline: true,
	isOn: false,
	lastActivityMinutes: 3,
};

const sensor: MockDevice = {
	id: "e2e-dashboard-sensor",
	name: "Sensor de Presença",
	brand: "Xiaomi",
	externalId: "11:22:33:44:55:66",
	ipAddress: null,
	type: 3, // Sensor
	category: "Segurança",
	room: null,
	roomId: null,
	isOnline: true,
	isOn: false,
	lastActivityMinutes: 5,
};

test.describe("E2E: Dashboard", () => {
	test("DashboardView_AmbientesEDispositivosCarregados_DeveAgruparPorComodoESemAmbiente", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, [lamp, sensor]);
		await mockDashboardEssentials(page);

		// Act
		await loginAndGoToDashboard(page);

		// Assert
		await expect(
			page.getByRole("heading", { name: "Visão Geral" }),
		).toBeVisible();
		await expect(page.getByText(mockRoom.name, { exact: true })).toBeVisible();
		await expect(page.getByText("Lâmpada da Sala")).toBeVisible();
		await expect(page.getByText("Sem Ambiente")).toBeVisible();
		await expect(page.getByText("Sensor de Presença")).toBeVisible();
	});

	test("DashboardView_ClicarSwitchDoDispositivoNoCard_DeveAlternarEstadoVisualmente", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, [lamp]);
		await mockDashboardEssentials(page);
		await loginAndGoToDashboard(page);

		const toggleSwitch = page.getByRole("switch", {
			name: "Alternar estado de Lâmpada da Sala",
		});
		await expect(toggleSwitch).toHaveAttribute("aria-checked", "false");

		// Act
		await toggleSwitch.click();

		// Assert
		await expect(toggleSwitch).toHaveAttribute("aria-checked", "true");
	});

	test("DeviceTypeFilterChips_ClicarChipLuzes_DeveOcultarDispositivosDeOutrosTipos", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, [lamp, sensor]);
		await mockDashboardEssentials(page);
		await loginAndGoToDashboard(page);
		await expect(page.getByText("Sensor de Presença")).toBeVisible();

		// Act
		await page.getByRole("button", { name: /LUZES/ }).click();

		// Assert
		await expect(page.getByText("Lâmpada da Sala")).toBeVisible();
		await expect(page.getByText("Sensor de Presença")).toBeHidden();
	});

	test("DashboardView_ClicarRecolherTodos_DeveEsconderOsDispositivosDeTodasAsSecoes", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, [lamp, sensor]);
		await mockDashboardEssentials(page);
		await loginAndGoToDashboard(page);
		await expect(page.getByText("Lâmpada da Sala")).toBeVisible();

		// Act
		await page.getByRole("button", { name: /Recolher todos/i }).click();

		// Assert
		await expect(page.getByText("Lâmpada da Sala")).toBeHidden();
		await expect(page.getByText("Sensor de Presença")).toBeHidden();
	});

	test("DashboardView_FalhaAoCarregarAmbientesEDispositivos_DeveExibirErroERecuperarAoTentarNovamente", async ({
		page,
	}) => {
		// Arrange — primeira chamada de /rooms falha, a segunda (após o
		// "Tentar novamente") sucede com o cômodo real.
		// TanStack Query já faz 1 retry automático (2 tentativas) antes de
		// desistir e mostrar o erro — só a 3ª tentativa (o clique manual em
		// "Tentar novamente") deve suceder, senão o retry automático mascara
		// o estado de erro e o botão nunca chega a aparecer.
		let roomsAttempts = 0;
		await page.route("http://localhost:5252/api/rooms*", async (route) => {
			roomsAttempts += 1;
			if (roomsAttempts <= 2) {
				await route.fulfill({
					status: 500,
					contentType: "application/json",
					body: JSON.stringify({ title: "Erro Interno do Servidor" }),
				});
				return;
			}
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([mockRoom]),
			});
		});
		await mockDevicesApi(page, [lamp]);
		await mockDashboardEssentials(page);

		// Act
		await loginAndGoToDashboard(page);

		// Assert — estado de erro aparece após o retry automático do TanStack Query esgotar
		await expect(
			page.getByText(/não foi possível carregar os ambientes e dispositivos/i),
		).toBeVisible({ timeout: 10_000 });

		// Act — recuperação manual
		await page.getByRole("button", { name: /tentar novamente/i }).click();

		// Assert
		await expect(page.getByText(mockRoom.name, { exact: true })).toBeVisible();
		await expect(page.getByText("Lâmpada da Sala")).toBeVisible();
	});

	test("EnergyLoadWidget_SemConsumoRegistradoHoje_DeveExibirEstadoVazio", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, []);
		await mockDashboardEssentials(page, emptyDashboardOverview());

		// Act
		await loginAndGoToDashboard(page);

		// Assert
		await expect(
			page.getByText("Nenhum consumo registrado hoje"),
		).toBeVisible();
	});

	test("StatusHubSummary_ConsumoEstimado_DeveExibirValorComPrefixoDeAproximacao", async ({
		page,
	}) => {
		// Arrange — consumo inclui um dispositivo sem sensor de energia real
		// (ex: TV via ADB/Cast), backend sinaliza isEnergyEstimated=true.
		const overview: MockDashboardOverview = {
			summary: {
				totalDevicesCount: 1,
				onlineDevicesCount: 1,
				energyConsumptionKwh: 0.13,
				isEnergyEstimated: true,
				averageTemperatureCelsius: 23,
				temperatureTrend: 0,
				activeAlertsCount: 0,
			},
			energyChart: [
				{
					timestamp: new Date().toISOString(),
					value: 0.13,
					isEstimated: true,
				},
			],
			roomUsage: [],
			recentActivities: [],
		};
		await mockRoomsApi(page);
		await mockDevicesApi(page, []);
		await mockDashboardEssentials(page, overview);

		// Act
		await loginAndGoToDashboard(page);

		// Assert
		await expect(page.getByText("~130", { exact: true })).toBeVisible();
		await expect(
			page.getByText(/acumulado hoje · inclui estimativa/i),
		).toBeVisible();
	});

	test("ActivityLogTimeline_AtividadesRecentesDoBackend_DevemAparecerNaLinhaDoTempo", async ({
		page,
	}) => {
		// Arrange
		const entries: MockActivityLogEntry[] = [
			{
				id: "e2e-event-1",
				deviceId: lamp.id,
				eventType: "DeviceStatus",
				title: "Lâmpada da Sala ligado",
				description: `Ambiente: ${mockRoom.name}`,
				timestamp: new Date().toISOString(),
			},
		];
		await mockRoomsApi(page);
		await mockDevicesApi(page, [lamp]);
		await mockDashboardOverviewApi(page);
		await mockActivityLogApi(page, entries);
		await mockSpotifyDisconnected(page);

		// Act
		await loginAndGoToDashboard(page);

		// Assert
		await expect(page.getByText("Lâmpada da Sala ligado")).toBeVisible();
		await expect(page.getByText(`Ambiente: ${mockRoom.name}`)).toBeVisible();
	});
});
