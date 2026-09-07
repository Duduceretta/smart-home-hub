import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { CardErrorFallback } from "../CardErrorFallback";

describe("CardErrorFallback Unit Tests", () => {
	it("CardErrorFallback_Render_ShouldShowMessageAndRoleAlert", () => {
		// Arrange & Act
		renderWithProviders(
			<CardErrorFallback
				message="Não foi possível carregar os dados."
				retryLabel="Tentar de novo"
				onRetry={vi.fn()}
			/>,
		);

		// Assert
		const alert = screen.getByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(
			screen.getByText("Não foi possível carregar os dados."),
		).toBeInTheDocument();
	});

	it("CardErrorFallback_ClickRetry_ShouldCallOnRetry", async () => {
		// Arrange
		const onRetry = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<CardErrorFallback
				message="Falha ao carregar."
				retryLabel="Tentar de novo"
				onRetry={onRetry}
			/>,
		);

		// Act
		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		// Assert
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("CardErrorFallback_ChildrenProvided_ShouldRenderChildrenInsteadOfMessage", () => {
		// Arrange & Act
		renderWithProviders(
			<CardErrorFallback
				message="Não deveria aparecer"
				retryLabel="Tentar de novo"
				onRetry={vi.fn()}
			>
				<span>Conteúdo customizado</span>
			</CardErrorFallback>,
		);

		// Assert
		expect(screen.getByText("Conteúdo customizado")).toBeInTheDocument();
		expect(screen.queryByText("Não deveria aparecer")).not.toBeInTheDocument();
	});
});
