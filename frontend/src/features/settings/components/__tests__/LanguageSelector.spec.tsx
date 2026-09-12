import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/core/i18n";
import {
	renderWithProviders,
	screen,
	userEvent,
	within,
} from "@/testing/test-utils";
import { LanguageSelector } from "../LanguageSelector";

describe("LanguageSelector Integration Tests", () => {
	beforeEach(async () => {
		localStorage.clear();
		await i18n.changeLanguage("pt-BR");
	});

	it("LanguageSelector_DefaultState_ShouldRenderBrazilFlagAndLanguageNameForPtBr", () => {
		// Act
		renderWithProviders(<LanguageSelector />);

		// Assert
		const trigger = screen.getByRole("button", {
			name: /selecionar idioma|idioma/i,
		});
		expect(trigger).toBeInTheDocument();
		expect(within(trigger).getByTestId("flag-brazil")).toBeInTheDocument();
		expect(trigger).toHaveTextContent("Português");
	});

	it("LanguageSelector_OpenDropdown_ShouldListSupportedLanguagesWithSvgFlags", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<LanguageSelector />);

		// Act - open dropdown
		const trigger = screen.getByRole("button", {
			name: /selecionar idioma|idioma/i,
		});
		await user.click(trigger);

		// Assert options
		const ptOption = await screen.findByRole("menuitemradio", {
			name: /português/i,
		});
		const enOption = await screen.findByRole("menuitemradio", {
			name: /english/i,
		});

		expect(ptOption).toBeInTheDocument();
		expect(within(ptOption).getByTestId("flag-brazil")).toBeInTheDocument();
		expect(enOption).toBeInTheDocument();
		expect(within(enOption).getByTestId("flag-usa")).toBeInTheDocument();
	});

	it("LanguageSelector_SelectEnglish_ShouldChangeLanguageAndReflectOnTrigger", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<LanguageSelector />);

		const trigger = screen.getByRole("button", {
			name: /selecionar idioma|idioma/i,
		});
		await user.click(trigger);

		// Act - select English
		const enOption = await screen.findByRole("menuitemradio", {
			name: /english/i,
		});
		await user.click(enOption);

		// Assert
		expect(i18n.language).toContain("en");
		expect(within(trigger).getByTestId("flag-usa")).toBeInTheDocument();
		expect(trigger).toHaveTextContent("English");
	});

	it("LanguageSelector_SelectPortugueseAfterEnglish_ShouldRestorePtBr", async () => {
		// Arrange
		const user = userEvent.setup();
		await i18n.changeLanguage("en-US");
		renderWithProviders(<LanguageSelector />);

		const trigger = screen.getByRole("button", {
			name: /select language|language/i,
		});
		expect(within(trigger).getByTestId("flag-usa")).toBeInTheDocument();
		expect(trigger).toHaveTextContent("English");

		// Act - switch back to Portuguese
		await user.click(trigger);
		const ptOption = await screen.findByRole("menuitemradio", {
			name: /português/i,
		});
		await user.click(ptOption);

		// Assert
		expect(i18n.language).toContain("pt");
		expect(within(trigger).getByTestId("flag-brazil")).toBeInTheDocument();
		expect(trigger).toHaveTextContent("Português");
	});

	it("LanguageSelector_Hover_ShouldShowTooltip", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<LanguageSelector />);

		const trigger = screen.getByRole("button", {
			name: /selecionar idioma|idioma/i,
		});
		await user.hover(trigger);

		// Assert
		const tooltip = await screen.findByRole("tooltip", {
			name: /alterar idioma/i,
		});
		expect(tooltip).toBeInTheDocument();
	});
});
