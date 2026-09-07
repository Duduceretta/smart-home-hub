import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { SystemicFailureBanner } from "../SystemicFailureBanner";

describe("SystemicFailureBanner Unit Tests", () => {
	it("SystemicFailureBanner_Render_ShouldShowMessageWithRoleAlert", () => {
		// Arrange & Act
		renderWithProviders(<SystemicFailureBanner onRetryAll={vi.fn()} />);

		// Assert
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(
			screen.getByText(/não foi possível conectar ao servidor/i),
		).toBeInTheDocument();
	});

	it("SystemicFailureBanner_ClickRetry_ShouldCallOnRetryAll", async () => {
		// Arrange
		const onRetryAll = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(<SystemicFailureBanner onRetryAll={onRetryAll} />);

		// Act
		await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

		// Assert
		expect(onRetryAll).toHaveBeenCalledTimes(1);
	});
});
