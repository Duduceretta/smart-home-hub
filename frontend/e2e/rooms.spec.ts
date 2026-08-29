import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import {
	type MockPickerDevice,
	type MockRoom,
	mockAssignableDevicesApi,
	mockRoom,
	mockRoomDetailEssentials,
	mockRoomsCrudApi,
} from "./support/rooms-mocks";

async function goToRoomsPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Ambientes" }).click();
	await page.waitForURL(/\/rooms/);
}

test.describe("E2E: Gerenciamento de Ambientes", () => {
	test("RoomsView_SemAmbientesCadastrados_DeveExibirEstadoVazio", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsCrudApi(page, []);
		await mockAssignableDevicesApi(page, []);
		await loginAsTestUser(page);

		// Act
		await goToRoomsPage(page);

		// Assert
		await expect(page.getByText("Nenhum ambiente ainda")).toBeVisible();
	});

	test("RoomFormDialog_PreenchimentoValidoDoNome_DeveExibirNovoAmbienteNaLista", async ({
		page,
	}) => {
		// Arrange
		await mockRoomsCrudApi(page, []);
		await mockAssignableDevicesApi(page, []);
		await loginAsTestUser(page);
		await goToRoomsPage(page);

		// Act
		await page.getByRole("button", { name: "Criar primeiro ambiente" }).click();
		await expect(page.getByText("Novo Ambiente")).toBeVisible();

		await page.getByLabel(/Nome do ambiente/i).fill("Escritório");
		await page.getByRole("button", { name: "Criar Ambiente" }).click();

		// Assert
		await expect(page.getByText("Novo Ambiente")).toBeHidden();
		await expect(
			page.locator("[data-room-item]").filter({ hasText: "Escritório" }),
		).toBeVisible();
	});

	test("RoomListItem_SelecionarAmbiente_DeveExibirPainelDeDetalhesComDispositivo", async ({
		page,
	}) => {
		// Arrange
		const seedDevice: MockPickerDevice = {
			id: "e2e-room-device-01",
			name: "Lâmpada de Piso",
			brand: "Philips Hue",
			externalId: "AA:BB:CC:11:22:33",
			type: 1,
			integrationType: 1,
			roomId: mockRoom.id,
			isOnline: true,
			isOn: false,
		};
		const rooms: MockRoom[] = [{ ...mockRoom, automationCount: 0 }];
		await mockRoomsCrudApi(page, rooms);
		await mockAssignableDevicesApi(page, [seedDevice]);
		await mockRoomDetailEssentials(page);
		await loginAsTestUser(page);

		// Act
		await goToRoomsPage(page);
		await page
			.locator("[data-room-item]")
			.filter({ hasText: mockRoom.name })
			.click();

		// Assert
		await expect(
			page.getByRole("heading", { name: mockRoom.name }),
		).toBeVisible();
		await expect(page.getByText("Lâmpada de Piso")).toBeVisible();
	});

	test("RoomDeviceCard_AlternarEstadoDoDispositivo_DeveAtualizarSwitchVisualmente", async ({
		page,
	}) => {
		// Arrange
		const seedDevice: MockPickerDevice = {
			id: "e2e-room-device-toggle",
			name: "Tomada da Cozinha",
			brand: "Sonoff",
			externalId: "11:22:33:AA:BB:CC",
			type: 2,
			integrationType: 1,
			roomId: mockRoom.id,
			isOnline: true,
			isOn: false,
		};
		const rooms: MockRoom[] = [{ ...mockRoom, automationCount: 0 }];
		await mockRoomsCrudApi(page, rooms);
		await mockAssignableDevicesApi(page, [seedDevice]);
		await mockRoomDetailEssentials(page);
		await loginAsTestUser(page);
		await goToRoomsPage(page);
		await page
			.locator("[data-room-item]")
			.filter({ hasText: mockRoom.name })
			.click();

		const toggleSwitch = page.getByRole("switch", {
			name: /Ligar Tomada da Cozinha/i,
		});
		await expect(toggleSwitch).toHaveAttribute("aria-checked", "false");

		// Act
		await toggleSwitch.click();

		// Assert
		await expect(toggleSwitch).toHaveAttribute("aria-checked", "true");
	});

	test("DeleteRoomAlertDialog_ExcluirAmbiente_DeveRemoverDaLista", async ({
		page,
	}) => {
		// Arrange
		const rooms: MockRoom[] = [{ ...mockRoom, automationCount: 0 }];
		await mockRoomsCrudApi(page, rooms);
		await mockAssignableDevicesApi(page, []);
		await mockRoomDetailEssentials(page);
		await loginAsTestUser(page);
		await goToRoomsPage(page);

		// Act
		await page
			.getByRole("button", {
				name: `Excluir ambiente ${mockRoom.name}`,
				exact: true,
			})
			.click();

		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible();
		await confirmDialog.getByRole("button", { name: "Excluir" }).click();

		// Assert
		await expect(page.getByText("Nenhum ambiente ainda")).toBeVisible();
	});
});
