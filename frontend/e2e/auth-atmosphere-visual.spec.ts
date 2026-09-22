import { expect, test } from "@playwright/test";

test.describe("AuthLayout: Painel Direito - Atmosfera de Galáxia", () => {
	const authRoutes = [
		{ name: "login", path: "/login" },
		{ name: "register", path: "/register" },
		{ name: "forgot-password", path: "/forgot-password" },
		{ name: "reset-password", path: "/reset-password?oobCode=mockCode" },
		{ name: "verify-email", path: "/verify-email?oobCode=mockCode" },
	];

	for (const route of authRoutes) {
		test(`Desktop_${route.name}_DeveRenderizarAtmosferaDeGalaxiaComGridEGlowIntactos`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1440, height: 900 });
			await page.goto(route.path);

			// Background, nebulosa, lua, planetas, saturno, malha e estrelas presentes
			const desktopBg = page.getByTestId("desktop-auth-background");
			const moon = page.getByTestId("auth-moon");
			const nebula = page.getByTestId("auth-nebula");
			const planets = page.getByTestId("auth-planets");
			const saturn = page.getByTestId("auth-saturn");
			const hubNetwork = page.getByTestId("auth-hub-network");

			await expect(desktopBg).toBeVisible();
			await expect(moon).toBeAttached();
			await expect(nebula).toBeAttached();
			await expect(planets).toBeAttached();
			await expect(saturn).toBeAttached();
			await expect(hubNetwork).toBeAttached();

			// Aguarda resolução de lazy-loading do formulário e renderização dos corpos celestes
			await page.waitForSelector("form, h2", { state: "visible" });
			await page.waitForTimeout(800);

			// Captura screenshot da composição desktop (1440x900)
			await page.screenshot({
				path: `screenshots/auth/${route.name}-desktop.png`,
				fullPage: true,
			});

			// No login, captura também em 1080p e captura detalhada do painel direito
			if (route.name === "login") {
				const rightSection = page.locator("section").nth(1);
				if (await rightSection.isVisible()) {
					await rightSection.screenshot({
						path: "screenshots/auth/login-atmosphere-panel.png",
					});
				}

				// Captura em 1080p (1920x1080)
				await page.setViewportSize({ width: 1920, height: 1080 });
				await page.waitForTimeout(500);
				await page.screenshot({
					path: "screenshots/auth/login-desktop-1080p.png",
					fullPage: true,
				});
				if (await rightSection.isVisible()) {
					await rightSection.screenshot({
						path: "screenshots/auth/login-atmosphere-panel-1080p.png",
					});
				}
			}
		});
	}

	test("Mobile_NaoDeveRenderizarBackgroundDesktop", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/login");

		const desktopBg = page.getByTestId("desktop-auth-background");

		await expect(desktopBg).toBeHidden();

		await page.screenshot({
			path: "screenshots/auth/login-mobile.png",
			fullPage: true,
		});
	});

	test("ReducedMotion_DeveAtivarModoEstaticoSemAnimacoes", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto("/login");

		const desktopBg = page.getByTestId("desktop-auth-background");

		await expect(desktopBg).toHaveClass(/static-graphics/);

		await page.screenshot({
			path: "screenshots/auth/login-desktop-reduced-motion.png",
			fullPage: true,
		});
	});
});
