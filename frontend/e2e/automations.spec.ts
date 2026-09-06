import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import { mockAutomationsApi } from "./support/automations-mocks";

async function goToAutomationsPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Automações" }).click();
	await page.waitForURL(/\/automations/);
}

test.describe("E2E: Automações", () => {
	test("AutomationCreationWizard_FluxoCompletoDeCriacaoDeHorario_DeveCriarAutomaçãoEListar", async ({
		page,
	}) => {
		// Arrange
		await mockAutomationsApi(page, []);
		await loginAsTestUser(page);

		// Act - Navega até a página de automações
		await goToAutomationsPage(page);

		// Estado vazio ou botão de nova automação
		const newButton = page
			.getByRole("button", { name: "Nova Automação" })
			.first();
		await expect(newButton).toBeVisible();
		await newButton.click();

		// Step 1: Origem do Gatilho
		await expect(
			page.getByRole("heading", { name: "Qual a origem do gatilho?" }),
		).toBeVisible();

		await page.getByRole("button", { name: /Horário/i }).click();
		await page.getByRole("button", { name: "Próximo" }).click();

		// Step 2: Configuração do Horário
		await expect(
			page.getByRole("heading", { name: "Configure o horário" }),
		).toBeVisible();

		await page.locator("input#schedule-time").fill("07:00");
		await page.getByRole("button", { name: "Próximo" }).click();

		// Step 3: Ações
		await expect(
			page.getByRole("heading", { name: "O que deve acontecer?" }),
		).toBeVisible();

		await page.getByRole("button", { name: "Adicionar Ação" }).click();

		// Seleciona o dispositivo na lista de seleção
		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "Lâmpada do Quarto" }).click();
		await page.getByRole("button", { name: "Adicionar" }).click();

		await expect(page.getByText("Ligar Lâmpada do Quarto")).toBeVisible();
		await page.getByRole("button", { name: "Próximo" }).click();

		// Step 4: Revisão e Salvar
		await expect(
			page.getByRole("heading", { name: "Tudo pronto?" }),
		).toBeVisible();

		await page.getByLabel("Nome da automação").fill("Luzes do Amanhecer");
		await page.getByRole("button", { name: "Salvar Automação" }).click();

		// Assert - Modal fecha e card da automação aparece na lista
		await expect(
			page.getByRole("heading", { name: "Nova Automação" }),
		).toBeHidden();
		await expect(
			page.getByRole("heading", { name: "Luzes do Amanhecer" }),
		).toBeVisible();
	});
});
