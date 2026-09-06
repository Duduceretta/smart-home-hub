import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import {
	type MockAutomation,
	mockAutomationsApi,
} from "./support/automations-mocks";

async function goToAutomationsPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Automações" }).click();
	await page.waitForURL(/\/automations/);
}

test.describe("E2E: Edição de Automações", () => {
	test("AutomationEditModal_AlterarGatilhoEAdicionarAcao_DevePersistirEExibirNoPainel", async ({
		page,
	}) => {
		// Arrange: Automação baseada em sensor de temperatura
		const initialAutomation: MockAutomation = {
			id: "e2e-auto-edit-1",
			name: "Controle Climático",
			isActive: true,
			isDraft: false,
			triggerKind: 2,
			rulePayload: JSON.stringify({
				triggers: [
					{
						type: "device_state",
						deviceId: "e2e-auto-dev-2",
						stateType: "temperature",
					},
				],
				conditions: {
					operator: "AND",
					rules: [
						{
							deviceId: "e2e-auto-dev-2",
							property: "temperature",
							comparison: ">",
							value: 25,
						},
					],
				},
				actions: [],
			}),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			lastExecutedAt: null,
			hasFailedToday: false,
		};

		await mockAutomationsApi(page, [initialAutomation]);
		await loginAsTestUser(page);

		// Act - Navegar para /automations
		await goToAutomationsPage(page);

		// 1. Clicar na automação existente na lista para abrir o painel master-detail
		await page
			.locator("[data-automation-item]")
			.filter({ hasText: "Controle Climático" })
			.click();

		// Verificar que o painel de detalhes abriu exibindo o resumo inicial (25°C)
		await expect(
			page.getByRole("heading", { name: "Controle Climático" }),
		).toBeVisible();
		await expect(page.getByText(/25°C/)).toBeVisible();

		// 2. Clicar no botão "Editar" no cabeçalho do painel de detalhes
		await page.getByRole("button", { name: "Editar" }).click();

		// 3. Modal de edição aberto
		await expect(
			page.getByRole("heading", { name: "Editar Automação" }),
		).toBeVisible();

		// 4. Alterar o valor da condição de temperatura de 25 para 30
		const valueInput = page.locator("input#sensor-value");
		await valueInput.fill("30");

		// 5. Adicionar uma nova ação de atuador
		await page.getByRole("button", { name: "Adicionar Ação" }).click();

		// Seleciona o dispositivo atuador no combo
		await page.getByRole("combobox").last().click();
		await page.getByRole("option", { name: "Lâmpada do Quarto" }).click();

		// Salva o rascunho da ação
		await page.getByRole("button", { name: "Adicionar", exact: true }).click();
		await expect(page.getByText(/Ligar Lâmpada do Quarto/)).toBeVisible();

		// 6. Salvar as alterações da automação
		await page.getByRole("button", { name: "Salvar Alterações" }).click();

		// Assert - Modal fecha
		await expect(
			page.getByRole("heading", { name: "Editar Automação" }),
		).toBeHidden();

		// 7. Verificar que o painel de detalhes reflete a nova condição (30°C) e a nova ação
		await expect(page.getByText(/30°C/)).toBeVisible();
		await expect(page.getByText("• Ligar Lâmpada do Quarto")).toBeVisible();
	});
});
