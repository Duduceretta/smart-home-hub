import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DashboardErrorState } from "../DashboardErrorState";

describe("DashboardErrorState Integration Tests", () => {
	it("DashboardErrorState_Rendered_ShouldShowTitleAndSubtitle", () => {
		// Act
		renderWithProviders(
			<DashboardErrorState
				title="Não foi possível carregar os indicadores"
				subtitle="Verifique sua conexão e tente novamente."
				onRetry={vi.fn()}
			/>,
		);

		// Assert
		expect(
			screen.getByText("Não foi possível carregar os indicadores"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Verifique sua conexão e tente novamente."),
		).toBeInTheDocument();
	});

	it("DashboardErrorState_ClickRetry_ShouldCallOnRetry", async () => {
		// Arrange
		const onRetry = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<DashboardErrorState
				title="Erro"
				subtitle="Detalhe do erro"
				onRetry={onRetry}
			/>,
		);

		// Act
		await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

		// Assert
		expect(onRetry).toHaveBeenCalledTimes(1);
	});
});
