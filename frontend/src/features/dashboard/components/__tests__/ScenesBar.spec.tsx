import { describe, expect, it } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { ScenesBar } from "../ScenesBar";

describe("ScenesBar Integration Tests", () => {
	it("ScenesBar_Rendered_ShouldShowAllScenesAsInactive", () => {
		// Act
		renderWithProviders(<ScenesBar />);

		// Assert
		for (const label of [
			"Cheguei em Casa",
			"Cinema",
			"Modo Dormir",
			"Sair de Casa",
		]) {
			expect(screen.getByRole("button", { name: label })).toHaveAttribute(
				"aria-pressed",
				"false",
			);
		}
	});

	it("ScenesBar_ClickScene_ShouldMarkOnlyThatSceneAsActive", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ScenesBar />);

		// Act
		await user.click(screen.getByRole("button", { name: "Cinema" }));

		// Assert
		expect(screen.getByRole("button", { name: "Cinema" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(
			screen.getByRole("button", { name: "Cheguei em Casa" }),
		).toHaveAttribute("aria-pressed", "false");
	});

	it("ScenesBar_ClickActiveSceneAgain_ShouldToggleItOff", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<ScenesBar />);
		const cinemaButton = screen.getByRole("button", { name: "Cinema" });
		await user.click(cinemaButton);

		// Act — clica de novo na mesma cena já ativa
		await user.click(cinemaButton);

		// Assert
		expect(cinemaButton).toHaveAttribute("aria-pressed", "false");
	});
});
