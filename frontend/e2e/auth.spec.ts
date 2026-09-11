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

	test("AuthLayout_Backgrounds_DeveAlternarEntreMobileEDesktopConformeViewport", async ({
		page,
	}) => {
		const mobileBg = page.getByTestId("mobile-auth-background");
		const desktopBg = page.getByTestId("desktop-auth-background");
		const illustration = page.getByTestId("auth-illustration-container");

		// Teste em viewport mobile estreito (360x740)
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/login");
		await expect(mobileBg).toBeVisible();
		await expect(desktopBg).toBeHidden();
		await expect(illustration).toBeHidden();

		// Teste em viewport mobile intermediário (428x926)
		await page.setViewportSize({ width: 428, height: 926 });
		await expect(mobileBg).toBeVisible();
		await expect(desktopBg).toBeHidden();
		await expect(illustration).toBeHidden();

		// Teste em viewport mobile landscape (667x375)
		await page.setViewportSize({ width: 667, height: 375 });
		await expect(mobileBg).toBeVisible();
		await expect(desktopBg).toBeHidden();
		await expect(illustration).toBeHidden();

		// Teste em viewport tablet portrait / iPad Mini (768x1024) - deve assumir layout mobile
		await page.setViewportSize({ width: 768, height: 1024 });
		await expect(mobileBg).toBeVisible();
		await expect(desktopBg).toBeHidden();
		await expect(illustration).toBeHidden();
		await expect(
			page.getByRole("button", { name: "Iniciar Sessão" }),
		).toBeVisible();

		// Teste em viewport tablet landscape / laptop pequeno (1024x768) - layout desktop de duas colunas
		await page.setViewportSize({ width: 1024, height: 768 });
		await expect(mobileBg).toBeHidden();
		await expect(desktopBg).toBeVisible();
		await expect(illustration).toBeVisible();

		// Teste em viewport desktop padrão (1280x800)
		await page.setViewportSize({ width: 1280, height: 800 });
		await expect(mobileBg).toBeHidden();
		await expect(desktopBg).toBeVisible();
		await expect(illustration).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Iniciar Sessão" }),
		).toBeVisible();

		// Teste em viewport desktop Full HD (1920x1080)
		await page.setViewportSize({ width: 1920, height: 1080 });
		await expect(mobileBg).toBeHidden();
		await expect(desktopBg).toBeVisible();
		await expect(illustration).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Iniciar Sessão" }),
		).toBeVisible();
	});
});
