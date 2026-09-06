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

test.describe("E2E: Associação e Desassociação de Dispositivos a Cômodos", () => {
	test("RoomDevices_AssociarEDesassociarDispositivo_DeveAtualizarGradeDeDispositivos", async ({
		page,
	}) => {
		// Arrange: 1 ambiente e 1 dispositivo órfão (sem roomId)
		const room: MockRoom = { ...mockRoom, automationCount: 0 };
		const orphanDevice: MockPickerDevice = {
			id: "e2e-orphan-dev",
			name: "Lâmpada Pendente",
			brand: "Yeelight",
			externalId: "EE:FF:11:22:33:44",
			type: 1,
			integrationType: 1,
			roomId: null,
			isOnline: true,
			isOn: false,
		};

		await mockRoomsCrudApi(page, [room]);
		await mockAssignableDevicesApi(page, [orphanDevice]);
		await mockRoomDetailEssentials(page);
		await loginAsTestUser(page);

		// Act - Navegar para /rooms
		await goToRoomsPage(page);

		// 1. Selecionar o cômodo na listagem master-detail
		await page
			.locator("[data-room-item]")
			.filter({ hasText: mockRoom.name })
			.click();

		await expect(
			page.getByRole("heading", { name: mockRoom.name }),
		).toBeVisible();
		await expect(
			page.getByText("Nenhum dispositivo neste ambiente ainda."),
		).toBeVisible();

		// 2. Abrir o picker de atribuição de dispositivos
		await page
			.getByRole("button", { name: "Adicionar Dispositivo a este Ambiente" })
			.click();

		await expect(
			page.getByRole("heading", { name: "Editar Ambiente" }),
		).toBeVisible();

		// 3. Associar o dispositivo órfão marcando o checkbox correspondente
		const orphanCheckboxLabel = page
			.locator("label")
			.filter({ hasText: "Lâmpada Pendente" });
		await orphanCheckboxLabel.click();
		await expect(
			orphanCheckboxLabel.locator("input[type='checkbox']"),
		).toBeChecked();

		// 4. Salvar as alterações
		await page.getByRole("button", { name: "Salvar Alterações" }).click();

		// Assert - Modal fecha e card do dispositivo é renderizado na grade do cômodo
		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(page.getByTitle("Lâmpada Pendente")).toBeVisible();

		// 5. Desassociar o dispositivo: abrir novamente o dialog de atribuição
		await page
			.getByRole("button", { name: "Adicionar Dispositivo a este Ambiente" })
			.click();

		await expect(
			page.getByRole("heading", { name: "Editar Ambiente" }),
		).toBeVisible();

		// 6. Desmarcar o dispositivo
		await orphanCheckboxLabel.click();
		await expect(
			orphanCheckboxLabel.locator("input[type='checkbox']"),
		).not.toBeChecked();

		// 7. Salvar as alterações
		await page.getByRole("button", { name: "Salvar Alterações" }).click();

		// Assert - Modal fecha e dispositivo é removido da grade do cômodo
		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(
			page.getByText("Nenhum dispositivo neste ambiente ainda."),
		).toBeVisible();
		await expect(page.getByTitle("Lâmpada Pendente")).toBeHidden();
	});
});
