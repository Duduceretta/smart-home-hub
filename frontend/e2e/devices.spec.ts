import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import {
	type MockDevice,
	mockDevicesApi,
	mockRoom,
	mockRoomsApi,
} from "./support/devices-mocks";

async function goToDevicesPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Dispositivos" }).click();
	await page.waitForURL(/\/devices/);
}

test.describe("E2E: Gerenciamento de Dispositivos", () => {
	test("DevicesGrid_SemDispositivosCadastrados_DeveExibirEstadoVazio", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, []);
		await loginAsTestUser(page);

		// Act
		await goToDevicesPage(page);

		// Assert
		await expect(page.getByText("Nenhum dispositivo cadastrado")).toBeVisible();
	});

	test("CreateDeviceSheet_PreenchimentoValidoDosCamposObrigatorios_DeveExibirNovoCardNaGrade", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsApi(page);
		await mockDevicesApi(page, []);
		await loginAsTestUser(page);
		await goToDevicesPage(page);

		// Act — "Novo Dispositivo" abre o modal de descoberta automática; o
		// cadastro manual é um passo dentro dele, não um formulário direto.
		await page.getByRole("button", { name: "Novo Dispositivo" }).click();
		await expect(page.getByText("Adicionar Novo Dispositivo")).toBeVisible();

		await page.getByRole("button", { name: "Configurar Manualmente" }).click();

		await page
			.getByLabel(/Nome do Dispositivo/i)
			.fill("Interruptor da Cozinha");
		await page.getByLabel(/Marca \/ Modelo/i).fill("Positivo Casa Inteligente");
		await page.getByLabel(/Identificador Externo \/ MAC/i).fill("AABBCC998877");

		await page.getByRole("combobox", { name: "Tipo de Atuador" }).click();
		await page.getByRole("option", { name: "Interruptor" }).click();

		await page.getByRole("button", { name: mockRoom.name }).click();

		await page.getByRole("button", { name: "Revisar Dispositivo" }).click();

		// Assert — passo de revisão mostra o resumo antes de confirmar
		await expect(page.getByText("Resumo do Dispositivo")).toBeVisible();
		await expect(
			page.getByText("Interruptor da Cozinha", { exact: true }),
		).toBeVisible();

		// Act — confirma a criação
		await page.getByRole("button", { name: "Adicionar Dispositivo" }).click();

		// Assert — tela de sucesso, depois fecha o modal
		await expect(page.getByText("Dispositivo cadastrado!")).toBeVisible();
		await page.getByRole("button", { name: "Concluir" }).click();

		await expect(page.getByText("Adicionar Novo Dispositivo")).toBeHidden();
		await expect(page.getByText("Interruptor da Cozinha")).toBeVisible();
	});

	test("DeviceCard_AlternarEstadoDoDispositivoExistente_DeveAtualizarSwitchVisualmente", async ({
		page,
	}) => {
		// Arrange
		const seedDevice: MockDevice = {
			id: "e2e-device-seed-toggle",
			name: "Luminária de Piso",
			brand: "Xiaomi",
			externalId: "AA:BB:CC:11:22:33",
			ipAddress: null,
			type: 1,
			category: "Iluminação",
			room: mockRoom.name,
			roomId: mockRoom.id,
			isOnline: true,
			isOn: false,
			lastActivityMinutes: 2,
		};
		await mockRoomsApi(page);
		await mockDevicesApi(page, [seedDevice]);
		await loginAsTestUser(page);
		await goToDevicesPage(page);

		const toggleSwitch = page.getByRole("switch", {
			name: "Alternar estado de Luminária de Piso",
		});
		await expect(toggleSwitch).toHaveAttribute("aria-checked", "false");

		// Act
		await toggleSwitch.click();

		// Assert
		await expect(toggleSwitch).toHaveAttribute("aria-checked", "true");
	});

	test("DeviceCard_ExcluirDispositivoViaMenuDeOpcoes_DeveRemoverCardDaGrade", async ({
		page,
	}) => {
		// Arrange
		const seedDevice: MockDevice = {
			id: "e2e-device-seed-delete",
			name: "Sensor de Presença",
			brand: "Sonoff",
			externalId: "11:22:33:AA:BB:CC",
			ipAddress: null,
			type: 3,
			category: "Segurança",
			room: mockRoom.name,
			roomId: mockRoom.id,
			isOnline: true,
			isOn: false,
			lastActivityMinutes: 1,
		};
		await mockRoomsApi(page);
		await mockDevicesApi(page, [seedDevice]);
		await loginAsTestUser(page);
		await goToDevicesPage(page);

		const deviceNameButton = page.getByRole("button", {
			name: "Sensor de Presença",
		});
		await expect(deviceNameButton).toBeVisible();

		// Act
		await page
			.getByRole("button", { name: "Mais opções do dispositivo" })
			.click();
		await page.getByRole("menuitem", { name: "Excluir" }).click();

		const confirmDialog = page.getByRole("alertdialog");
		await confirmDialog.getByRole("button", { name: "Excluir" }).click();

		// Assert
		await expect(deviceNameButton).toBeHidden();
		await expect(page.getByText("Nenhum dispositivo cadastrado")).toBeVisible();
	});
});
