import { expect, test } from "@playwright/test";
import {
	loginAsTestUser,
	mockBackendEssentials,
	mockFirebaseAuth,
	testUser,
} from "./support/auth-mocks";

test.describe("E2E: Fluxos de Autenticação", () => {
	test("LoginForm_SubmissaoComCamposVazios_DeveExibirErrosDeValidacaoSemNavegar", async ({
		page,
	}) => {
		// Arrange
		await page.goto("/login");

		// Act
		await page.getByRole("button", { name: "Iniciar Sessão" }).click();

		// Assert
		await expect(
			page.getByText("Digite um formato de e-mail válido."),
		).toBeVisible();
		await expect(page.getByText("A senha é obrigatória.")).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test("LoginForm_CredenciaisInvalidas_DeveExibirMensagemDeErroDeAutenticacao", async ({
		page,
	}) => {
		// Arrange
		await mockFirebaseAuth(page, "invalid-credentials");
		await page.goto("/login");

		// Act
		await page.getByLabel("Email").fill("usuario.inexistente@smarthome.local");
		await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada123!");
		await page.getByRole("button", { name: "Iniciar Sessão" }).click();

		// Assert
		await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test("LoginForm_CredenciaisValidas_DeveRedirecionarParaODashboard", async ({
		page,
	}) => {
		// Arrange
		await mockFirebaseAuth(page, "success");
		await mockBackendEssentials(page);
		await page.goto("/login");

		// Act
		await page.getByLabel("Email").fill(testUser.email);
		await page.getByLabel("Senha", { exact: true }).fill("SenhaValida123!");
		await page.getByRole("button", { name: "Iniciar Sessão" }).click();

		// Assert
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: "Visão Geral" }),
		).toBeVisible();
	});

	test("LogoutButton_ConfirmarSaida_DeveRetornarParaTelaDeLogin", async ({
		page,
	}) => {
		// Arrange
		await loginAsTestUser(page);

		// Act
		await page.getByRole("button", { name: "Sair", exact: true }).click();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Sim, Sair" })
			.click();

		// Assert
		await expect(page).toHaveURL(/\/login/);
		await expect(
			page.getByRole("heading", { name: "Bem-vindo(a)" }),
		).toBeVisible();
	});

	test("AuthLayout_MobileBackground_DeveExibirFundoAnimadoEmTelasMobileEOcultarEmDesktop", async ({
		page,
	}) => {
		// Teste em viewport mobile estreito (360x740)
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/login");

		const mobileBg = page.getByTestId("mobile-auth-background");
		await expect(mobileBg).toBeVisible();

		// Teste em viewport mobile intermediário (428x926)
		await page.setViewportSize({ width: 428, height: 926 });
		await expect(mobileBg).toBeVisible();

		// Teste em viewport desktop (1280x800) - deve estar oculto via md:hidden
		await page.setViewportSize({ width: 1280, height: 800 });
		await expect(mobileBg).toBeHidden();
	});
});
