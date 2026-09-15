import { expect, test } from "@playwright/test";

const AUTH_ROUTES = [
	{ name: "login", path: "/login" },
	{ name: "register", path: "/register" },
	{ name: "forgot-password", path: "/forgot-password" },
	{ name: "reset-password", path: "/reset-password?oobCode=demo-token" },
	{ name: "verify-email", path: "/verify-email" },
];

const ZOOM_PRESETS = [
	{ name: "100", zoom: 1.0, width: 1920, height: 1080 },
	{ name: "125", zoom: 1.25, width: 1536, height: 864 },
	{ name: "150", zoom: 1.5, width: 1280, height: 720 },
	{ name: "200", zoom: 2.0, width: 960, height: 540 },
];

test.describe("Parte 1 — Hardware sem GPU e Renderização por Software", () => {
	test("SoftwareRenderer_SwiftShaderDetectado_AplicaModoEstaticoSemAnimacoes", async ({
		page,
	}) => {
		// Mock WebGL retornando SwiftShader no renderer
		await page.addInitScript(() => {
			const originalGetContext = HTMLCanvasElement.prototype.getContext;
			// @ts-expect-error - mock experimental webgl
			HTMLCanvasElement.prototype.getContext = function (
				type: string,
				...args: unknown[]
			) {
				if (type === "webgl" || type === "experimental-webgl") {
					return {
						getExtension(name: string) {
							if (name === "WEBGL_debug_renderer_info") {
								return { UNMASKED_RENDERER_WEBGL: 37446 };
							}
							return null;
						},
						getParameter(pname: number) {
							if (pname === 37446) {
								return "Google SwiftShader (ANGLE 2.1.0)";
							}
							return "";
						},
					};
				}
				// @ts-expect-error - delegando contexto
				return originalGetContext.call(this, type, ...args);
			};
		});

		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto("/login", { waitUntil: "domcontentloaded" });

		// Aguarda o card de login carregar e renderizar
		const formContainer = page
			.locator("main form, main [class*='max-w']")
			.first();
		await expect(formContainer).toBeVisible({ timeout: 15000 });

		// Verifica se a classe static-graphics foi aplicada na ilustração e layout
		const layout = page.locator("main");
		await expect(layout).toHaveClass(/static-graphics/);

		const illustration = page.locator(
			"svg[aria-label='Corte arquitetônico da residência']",
		);
		await expect(illustration).toHaveClass(/static-graphics/);

		// Aguarda estabilização visual
		await page.waitForTimeout(600);

		// Tira screenshot de comprovação do ambiente sem GPU / software renderer
		await page.screenshot({
			path: "e2e/screenshots/software-renderer-login.png",
			fullPage: true,
		});
	});
});

test.describe("Parte 2 e 3 — Auditoria de Robustez de Zoom e Ancoragem", () => {
	for (const route of AUTH_ROUTES) {
		for (const preset of ZOOM_PRESETS) {
			test(`${route.name} em zoom de ${preset.name}%`, async ({ page }) => {
				await page.setViewportSize({
					width: preset.width,
					height: preset.height,
				});

				await page.goto(route.path, { waitUntil: "domcontentloaded" });

				// Verifica se o card do formulário está montado
				const formContainer = page
					.locator("main form, main [class*='max-w']")
					.first();
				await expect(formContainer).toBeVisible({ timeout: 15000 });

				// Aguarda o fade-in do card e de seus botões/inputs
				await page.waitForFunction(() => {
					const card = document.querySelector("main [class*='max-w-']");
					if (!card) return false;
					const style = window.getComputedStyle(card);
					return style.opacity !== "0" && style.visibility !== "hidden";
				});

				// Aguarda transições de animação
				await page.waitForTimeout(750);

				// Verifica que não há scroll horizontal quebrado
				const hasHorizontalScroll = await page.evaluate(() => {
					return document.documentElement.scrollWidth > window.innerWidth + 2;
				});
				expect(hasHorizontalScroll).toBe(false);

				// No desktop (largura >= 1024), valida que o Wordmark e o fio da lâmpada mantêm espaçamento seguro
				if (preset.width >= 1024) {
					const wordmarkBox = await page
						.locator("[data-testid='auth-wordmark'] svg")
						.boundingBox();
					const wireBox = await page
						.locator("line[x1='190'][x2='190']")
						.boundingBox();
					const badgeBox = await page
						.locator("[data-testid='auth-status-badge']")
						.boundingBox();

					expect(wordmarkBox).not.toBeNull();
					expect(wireBox).not.toBeNull();
					expect(badgeBox).not.toBeNull();

					if (wordmarkBox && wireBox) {
						// Sem tocar nem sobrepor = sem interseção real de retângulo (X e Y),
						// não apenas X — o fio fica bem mais abaixo do wordmark verticalmente
						// e comparar só X gera falso positivo quando o viewport encolhe.
						const overlapsX =
							wordmarkBox.x < wireBox.x + wireBox.width &&
							wordmarkBox.x + wordmarkBox.width > wireBox.x;
						const overlapsY =
							wordmarkBox.y < wireBox.y + wireBox.height &&
							wordmarkBox.y + wordmarkBox.height > wireBox.y;
						expect(overlapsX && overlapsY).toBe(false);
					}

					if (badgeBox) {
						// O badge deve estar dentro da viewport visível e na coluna esquerda
						expect(badgeBox.x).toBeGreaterThanOrEqual(0);
						expect(badgeBox.x + badgeBox.width).toBeLessThan(
							preset.width * (7 / 12),
						);
					}
				}

				// Captura screenshot para auditoria visual
				await page.screenshot({
					path: `e2e/screenshots/zoom/${route.name}-${preset.name}.png`,
					fullPage: true,
				});
			});
		}
	}
});
