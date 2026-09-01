import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { HistoryBackToTopButton } from "../HistoryBackToTopButton";

describe("HistoryBackToTopButton Component Tests", () => {
	it("HistoryBackToTopButton_InitialState_ShouldBeHidden", () => {
		// Arrange & Act
		renderWithProviders(<HistoryBackToTopButton />);

		// Assert
		const button = screen.getByRole("button", { name: /voltar ao topo/i });
		expect(button).toHaveClass("opacity-0");
		expect(button).toHaveClass("pointer-events-none");
	});

	it("HistoryBackToTopButton_WhenWindowScrolledDown_ShouldBecomeVisible", () => {
		// Arrange
		renderWithProviders(<HistoryBackToTopButton />);
		const button = screen.getByRole("button", { name: /voltar ao topo/i });

		// Act: simulate window scroll down
		Object.defineProperty(window, "scrollY", { value: 350, writable: true });
		fireEvent.scroll(window);

		// Assert
		expect(button).toHaveClass("opacity-100");
		expect(button).toHaveClass("pointer-events-auto");
	});

	it("HistoryBackToTopButton_OnClick_ShouldTriggerScrollToTop", async () => {
		// Arrange
		const scrollToMock = vi.fn();
		window.scrollTo = scrollToMock;
		Object.defineProperty(window, "scrollY", { value: 400, writable: true });

		const user = userEvent.setup();
		renderWithProviders(<HistoryBackToTopButton />);
		fireEvent.scroll(window);

		const button = screen.getByRole("button", { name: /voltar ao topo/i });

		// Act
		await user.click(button);

		// Assert
		expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
	});
});
