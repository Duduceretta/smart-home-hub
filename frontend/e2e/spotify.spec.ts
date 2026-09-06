import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./support/auth-mocks";
import { mockSpotifyApi } from "./support/spotify-mocks";

async function goToSettingsPage(page: import("@playwright/test").Page) {
	await page.getByRole("link", { name: "Configurações" }).click();
	await page.waitForURL(/\/settings/);
}

test.describe("E2E: Integração Spotify", () => {
	test("SpotifyConnectCard_FluxoCompletoDeConexaoEDesconexao_DeveAtualizarEstadoVisual", async ({
		page,
	}) => {
		// Arrange - Inicia desconectado
		const spotifyState = await mockSpotifyApi(page, false, "Eduardo Silva");
		await loginAsTestUser(page);

		// Act - Navega até Configurações
		await goToSettingsPage(page);

		// 1. Estado Inicial: Botão de conectar visível
		const connectButton = page
			.getByRole("button", { name: /Conectar Spotify/i })
			.first();
		await expect(connectButton).toBeVisible();

		// Act - Clica em Conectar (simula fluxo OAuth)
		// Atualiza o estado do mock para quando a página recarregar com ?spotify=connected
		spotifyState.status.connected = true;
		spotifyState.status.displayName = "Eduardo Silva";

		await connectButton.click();

		// Assert - Conectado com sucesso
		await expect(page.getByText(/Conectado como Eduardo Silva/i)).toBeVisible();

		// 2. Estado Conectado: Botão de desconectar visível
		const disconnectButton = page.getByRole("button", { name: /Desconectar/i });
		await expect(disconnectButton).toBeVisible();

		// Act - Desconecta
		await disconnectButton.click();

		// Assert - Volta ao estado desconectado
		await expect(
			page.getByRole("button", { name: /Conectar Spotify/i }).first(),
		).toBeVisible();
		await expect(page.getByText(/Conectado como Eduardo Silva/i)).toBeHidden();
	});
});
