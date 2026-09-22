import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		// Chromium defaults to en-US, which makes i18next's LanguageDetector
		// pick English instead of the app's pt-BR fallback. Pin it so tests
		// are deterministic regardless of the host machine's locale.
		locale: "pt-BR",
		// Resolução de referência do design (bate com auth-atmosphere-visual.spec.ts).
		// Sem isso, specs que não chamam setViewportSize herdam o 1280x720 padrão do
		// devices["Desktop Chrome"], que corta o background SVG (preserveAspectRatio
		// slice) numa proporção diferente da usada pra desenhar/validar a composição.
		viewport: { width: 1440, height: 900 },
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev",
		url: "http://localhost:5173",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});
