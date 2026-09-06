import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import {
	mockDefaultHistoryEvents,
	mockHistoryApi,
} from "./support/history-mocks";

async function goToHistoryPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Histórico" }).click();
	await page.waitForURL(/\/history/);
}

test.describe("E2E: Histórico de Eventos e Auditoria", () => {
	test("HistoryView_FiltrosEExportacao_DeveFiltrarCorretamenteEDispararDownload", async ({
		page,
	}) => {
		// Arrange
		await mockHistoryApi(page, mockDefaultHistoryEvents);
		await loginAsTestUser(page);

		// Act - Navegar para /history
		await goToHistoryPage(page);

		// Assert - Título da tela visível
		await expect(
			page.getByRole("heading", { name: "Histórico de Eventos" }),
		).toBeVisible();

		// Eventos iniciais visíveis
		await expect(
			page.getByText("Lâmpada da Sala foi ligada manualmente"),
		).toBeVisible();
		await expect(
			page.getByText("Automação 'Ar-condicionado Noite' executada com sucesso"),
		).toBeVisible();
		await expect(
			page.getByText("Falha de comunicação com Gateway Zigbee"),
		).toBeVisible();

		// 1. Aplicar filtro textual
		const searchInput = page.getByRole("textbox", { name: "Buscar eventos" });
		await searchInput.fill("Termostato");

		await expect(
			page.getByText("Automação 'Ar-condicionado Noite' executada com sucesso"),
		).toBeVisible();
		await expect(
			page.getByText("Lâmpada da Sala foi ligada manualmente"),
		).toBeHidden();

		// Limpa busca
		await searchInput.fill("");
		await expect(
			page.getByText("Lâmpada da Sala foi ligada manualmente"),
		).toBeVisible();

		// 2. Aplicar filtro de severidade
		const severitySelect = page.getByLabel("Severidade");
		await severitySelect.selectOption("Error");

		await expect(
			page.getByText("Falha de comunicação com Gateway Zigbee"),
		).toBeVisible();
		await expect(
			page.getByText("Lâmpada da Sala foi ligada manualmente"),
		).toBeHidden();

		// Restaura severidade para todas
		await severitySelect.selectOption("all");
		await expect(
			page.getByText("Lâmpada da Sala foi ligada manualmente"),
		).toBeVisible();

		// 3. Aplicar filtro de período (timeframe)
		const timeframeSelect = page.getByLabel("Período");
		await timeframeSelect.selectOption("24h");

		// 4. Exportar relatório como CSV
		const csvDownloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: "Exportar Logs" }).click();
		await page.getByRole("menuitem", { name: "Exportar como CSV" }).click();
		const csvDownload = await csvDownloadPromise;
		expect(csvDownload.suggestedFilename()).toMatch(/^audit-logs-.*\.csv$/);

		// 5. Exportar relatório como JSON
		const jsonDownloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: "Exportar Logs" }).click();
		await page.getByRole("menuitem", { name: "Exportar como JSON" }).click();
		const jsonDownload = await jsonDownloadPromise;
		expect(jsonDownload.suggestedFilename()).toMatch(/^audit-logs-.*\.json$/);
	});
});
