import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import { mockDeviceGroupsApi } from "./support/device-groups-mocks";

async function goToDeviceGroupsPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Grupos" }).click();
	await page.waitForURL(/\/device-groups/);
}

test.describe("E2E: Grupos de Dispositivos", () => {
	test("DeviceGroup_CriacaoCompletaEControleMestreDeBrilho_DeveAtualizarBrilho", async ({
		page,
	}) => {
		// Arrange
		await mockDeviceGroupsApi(page, []);
		await loginAsTestUser(page);

		// Act - Navega até Grupos
		await goToDeviceGroupsPage(page);

		// Abre modal de criação
		await page
			.getByRole("button", { name: /Criar Primeiro Grupo|Novo Grupo/i })
			.click();

		await expect(page.getByText("Adicionar Novo Grupo")).toBeVisible();

		// Preenche nome
		await page
			.getByPlaceholder("Ex: Todas as Luzes, Home Theater, Segurança")
			.fill("Iluminação Geral");

		// Seleciona dispositivos (checkboxes na lista de seleção múltipla)
		await page.getByRole("checkbox", { name: /Lâmpada Teto/i }).click();
		await page.getByRole("checkbox", { name: /Fita LED/i }).click();

		// Submete formulário
		await page.getByRole("button", { name: "Registrar Grupo" }).click();

		// Assert - Modal fecha e grupo aparece selecionado no painel de detalhe
		await expect(page.getByText("Adicionar Novo Grupo")).toBeHidden();
		await expect(
			page.getByRole("heading", { name: "Iluminação Geral" }),
		).toBeVisible();
		await expect(page.getByText("Brilho Coletivo")).toBeVisible();

		// Valida slider de brilho mestre
		const brightnessSlider = page.getByRole("slider", {
			name: "Ajustar brilho coletivo",
		});
		await expect(brightnessSlider).toBeVisible();
		await expect(brightnessSlider).toHaveValue("50");
		await expect(page.getByText("50%")).toBeVisible();
	});
});
