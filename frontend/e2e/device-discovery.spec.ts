import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import {
	mockDevicesApi,
	mockRoom,
	mockRoomsApi,
} from "./support/devices-mocks";

async function goToDevicesPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Dispositivos" }).click();
	await page.waitForURL(/\/devices/);
}

test.describe("E2E: Descoberta de Dispositivos de Rede (SignalR)", () => {
	test("DeviceDiscovery_FluxoCompletoDescobertaEAssociacao_DeveCadastrarEExibirNaLista", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page, [mockRoom]);
		await mockDevicesApi(page, []);
		await loginAsTestUser(page);

		// Act - Navegar para /devices
		await goToDevicesPage(page);

		// 1. Abrir modal de descoberta automática via botão "Novo Dispositivo"
		await page.getByRole("button", { name: "Novo Dispositivo" }).click();
		await expect(
			page.getByRole("heading", { name: "Adicionar Novo Dispositivo" }),
		).toBeVisible();

		// 2. Simular o recebimento do evento SignalR "DeviceDiscovered"
		const discoveredDevice = {
			temporaryId: "temp-disco-1",
			name: "Sensor de Presença Inteligente",
			brand: "ESPHome",
			externalId: "AA:BB:CC:DD:EE:FF",
			type: 4,
			integrationType: 9,
			ipAddress: "192.168.1.105",
			macAddress: "AA:BB:CC:DD:EE:FF",
			signalStrength: -45,
			additionalProperties: null,
			upnpServices: null,
		};

		await page.evaluate((payload) => {
			const win = window as unknown as {
				__simulateSignalREvent?: (event: string, ...args: unknown[]) => void;
			};
			win.__simulateSignalREvent?.("DeviceDiscovered", payload);
		}, discoveredDevice);

		// 3. Validar que o card do dispositivo descoberto apareceu na lista
		await expect(
			page.getByText("Sensor de Presença Inteligente"),
		).toBeVisible();

		// 4. Clicar no dispositivo para avançar para a etapa de configuração
		await page.getByText("Sensor de Presença Inteligente").click();

		// 5. Vincular ao cômodo "Sala de Estar"
		await page.getByRole("button", { name: mockRoom.name }).click();

		// 6. Avançar para a revisão
		await page.getByRole("button", { name: "Revisar Dispositivo" }).click();
		await expect(page.getByText("Resumo do Dispositivo")).toBeVisible();

		// 7. Concluir cadastro disparando POST /api/devices
		await page.getByRole("button", { name: "Adicionar Dispositivo" }).click();

		// 8. Validar tela de sucesso e clicar em Concluir
		await expect(page.getByText("Dispositivo cadastrado!")).toBeVisible();
		await page.getByRole("button", { name: "Concluir" }).click();

		// Assert - Modal fecha e dispositivo recém-criado é exibido na grade de dispositivos
		await expect(
			page.getByRole("heading", { name: "Adicionar Novo Dispositivo" }),
		).toBeHidden();

		await expect(
			page.getByRole("heading", { name: "Sensor de Presença Inteligente" }),
		).toBeVisible();
	});
});
