import { expect, test } from "@playwright/test";

test.describe("E2E: Smoke Test da Aplicação e Dispositivos", () => {
	test("deve carregar a aplicação e exibir os elementos estruturais da página inicial", async ({
		page,
	}) => {
		// Navega para a raiz da aplicação (http://localhost:5173)
		await page.goto("/");

		// Valida se o título da página ou a URL principal carregou
		await expect(page).toHaveURL(/\//);

		// Valida que o corpo da página foi renderizado e não está vazio
		const body = page.locator("body");
		await expect(body).toBeVisible();
	});
});
