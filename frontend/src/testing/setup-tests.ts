import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import i18n from "@/core/i18n";
import { server } from "./mocks/server";

beforeAll(async () => {
	// jsdom reports "en-US" via navigator.language, which makes i18next's
	// LanguageDetector pick English instead of the app's pt-BR fallback.
	// Pin the language so tests are deterministic regardless of environment.
	await i18n.changeLanguage("pt-BR");

	server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

globalThis.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

window.scrollTo = vi.fn();

// Radix UI (Select, DropdownMenu) relies on pointer capture and
// scrollIntoView APIs that jsdom does not implement.
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

// sonner's <Toaster /> reads the OS color scheme via matchMedia, unimplemented in jsdom.
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: vi.fn(),
	removeListener: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
}));
