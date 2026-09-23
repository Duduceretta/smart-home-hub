import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { useThemeUIStore } from "../../store/theme-ui.store";
import { ThemePresetSelector } from "../ThemePresetSelector";

describe("ThemePresetSelector Integration Tests", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
		useThemeUIStore.setState({ preset: "teal" });
	});

	it("ThemePresetSelector_DefaultState_ShouldMarkTealAsChecked", () => {
		// Act
		renderWithProviders(<ThemePresetSelector />);

		// Assert
		expect(screen.getByRole("radio", { name: "Verde Nexus" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Índigo" })).not.toBeChecked();
	});

	it("ThemePresetSelector_ClickIndigoOption_ShouldSelectItAndPersistToLocalStorage", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector />);

		// Act
		await user.click(screen.getByRole("radio", { name: "Índigo" }));

		// Assert
		expect(screen.getByRole("radio", { name: "Índigo" })).toBeChecked();
		expect(localStorage.getItem("app-theme-preset")).toBe("indigo");
		expect(document.documentElement.getAttribute("data-theme")).toBe("indigo");
	});

	it("ThemePresetSelector_ClickBackToDefaultPreset_ShouldRemoveDataThemeAttribute", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector />);
		await user.click(screen.getByRole("radio", { name: "Azul" }));

		// Act
		await user.click(screen.getByRole("radio", { name: "Verde Nexus" }));

		// Assert — reforço visual da seleção não depende só de cor (checked via input nativo)
		expect(screen.getByRole("radio", { name: "Verde Nexus" })).toBeChecked();
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
	});

	it("ThemePresetSelector_ClickOrchidOption_ShouldSelectItAndPersistToLocalStorage", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector />);

		// Act
		await user.click(screen.getByRole("radio", { name: "Orquídea" }));

		// Assert
		expect(screen.getByRole("radio", { name: "Orquídea" })).toBeChecked();
		expect(localStorage.getItem("app-theme-preset")).toBe("orchid");
		expect(document.documentElement.getAttribute("data-theme")).toBe("orchid");
	});

	it("ThemePresetSelector_DropdownVariant_ShouldRenderTriggerAndAllowSelectingPreset", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector variant="dropdown" />);

		// Act - click dropdown trigger
		const trigger = screen.getByRole("button");
		expect(trigger).toBeInTheDocument();
		await user.click(trigger);

		// Assert menu items are visible
		const indigoOption = await screen.findByRole("menuitemradio", {
			name: "Índigo",
		});
		expect(indigoOption).toBeInTheDocument();

		// Act - select Indigo
		await user.click(indigoOption);

		// Assert
		expect(localStorage.getItem("app-theme-preset")).toBe("indigo");
		expect(document.documentElement.getAttribute("data-theme")).toBe("indigo");
	});

	it("ThemePresetSelector_DropdownVariant_ShouldRenderTooltipWithChangeThemeText", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ThemePresetSelector variant="dropdown" />);

		const trigger = screen.getByRole("button");
		await user.hover(trigger);

		// Assert tooltip becomes visible
		const tooltip = await screen.findByRole("tooltip", {
			name: /alterar o tema/i,
		});
		expect(tooltip).toBeInTheDocument();
	});
});
