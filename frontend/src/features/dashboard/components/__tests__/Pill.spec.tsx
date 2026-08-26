import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { Pill } from "../Pill";

describe("Pill Integration Tests", () => {
	it("Pill_Inactive_ShouldRenderWithAriaPressedFalse", () => {
		// Act
		renderWithProviders(<Pill>Cheguei em Casa</Pill>);

		// Assert
		expect(
			screen.getByRole("button", { name: "Cheguei em Casa" }),
		).toHaveAttribute("aria-pressed", "false");
	});

	it("Pill_Active_ShouldRenderWithAriaPressedTrue", () => {
		// Act
		renderWithProviders(<Pill active>Cinema</Pill>);

		// Assert
		expect(screen.getByRole("button", { name: "Cinema" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("Pill_Click_ShouldCallOnClick", async () => {
		// Arrange
		const onClick = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(<Pill onClick={onClick}>Modo Dormir</Pill>);

		// Act
		await user.click(screen.getByRole("button", { name: "Modo Dormir" }));

		// Assert
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("Pill_NoOnClickProvided_ShouldNotThrowWhenClicked", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(<Pill>Sair de Casa</Pill>);

		// Act & Assert — não deve lançar erro mesmo sem handler
		await expect(
			user.click(screen.getByRole("button", { name: "Sair de Casa" })),
		).resolves.not.toThrow();
	});
});
