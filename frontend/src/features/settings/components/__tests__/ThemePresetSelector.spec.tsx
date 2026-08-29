import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { useThemeUIStore } from "../../store/theme-ui.store";
import { ThemePresetSelector } from "../ThemePresetSelector";

describe("ThemePresetSelector Integration Tests", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
		useThemeUIStore.setState({ preset: "zinc-minimalist" });
	});

	it("ThemePresetSelector_DefaultState_ShouldMarkZincMinimalistAsChecked", () => {
		// Act
		renderWithProviders(<ThemePresetSelector />);

		// Assert
		expect(
			screen.getByRole("radio", { name: "Zinc Minimalist" }),
		).toBeChecked();
		expect(screen.getByRole("radio", { name: "Indigo" })).not.toBeChecked();
	});

	it("ThemePresetSelector_ClickIndigoOption_ShouldSelectItAndPersistToLocalStorage", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector />);

		// Act
		await user.click(screen.getByRole("radio", { name: "Indigo" }));

		// Assert
		expect(screen.getByRole("radio", { name: "Indigo" })).toBeChecked();
		expect(localStorage.getItem("app-theme-preset")).toBe("indigo");
		expect(document.documentElement.getAttribute("data-theme")).toBe("indigo");
	});

	it("ThemePresetSelector_ClickBackToDefaultPreset_ShouldRemoveDataThemeAttribute", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector />);
		await user.click(screen.getByRole("radio", { name: "GitHub Dimmed" }));

		// Act
		await user.click(screen.getByRole("radio", { name: "Zinc Minimalist" }));

		// Assert — reforço visual da seleção não depende só de cor (checked via input nativo)
		expect(
			screen.getByRole("radio", { name: "Zinc Minimalist" }),
		).toBeChecked();
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
	});

	it("ThemePresetSelector_ClickContrastSafeGraphiteOption_ShouldSelectItAndPersistToLocalStorage", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector />);

		// Act
		await user.click(
			screen.getByRole("radio", { name: "Contrast Safe Graphite" }),
		);

		// Assert
		expect(
			screen.getByRole("radio", { name: "Contrast Safe Graphite" }),
		).toBeChecked();
		expect(localStorage.getItem("app-theme-preset")).toBe(
			"contrast-safe-graphite",
		);
		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"contrast-safe-graphite",
		);
	});
});
