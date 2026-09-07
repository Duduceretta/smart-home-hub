import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import type { HistoryKpiMetrics } from "../../types/history.types";
import { HistoryKpiCards } from "../HistoryKpiCards";

const stats: HistoryKpiMetrics = {
	totalEvents: 42,
	automationCount: 10,
	alertCount: 2,
	groupActionCount: 5,
};

describe("HistoryKpiCards Unit Tests", () => {
	it("HistoryKpiCards_ErrorWithNoCache_ShouldRenderNeutralFallbackCellsWithRetry", async () => {
		// Arrange
		const onRetry = vi.fn();
		const user = userEvent.setup();

		// Act
		renderWithProviders(
			<HistoryKpiCards
				stats={undefined}
				isLoading={false}
				isError
				onRetry={onRetry}
			/>,
		);

		// Assert
		const alerts = screen.getAllByRole("alert");
		expect(alerts).toHaveLength(4);
		expect(screen.queryByText("42")).not.toBeInTheDocument();

		await user.click(
			screen.getAllByRole("button", { name: "Tentar novamente" })[0],
		);
		expect(onRetry).toHaveBeenCalled();
	});

	it("HistoryKpiCards_ErrorWithCache_ShouldKeepValuesAndShowStaleIndicator", async () => {
		// Act
		renderWithProviders(
			<HistoryKpiCards stats={stats} isLoading={false} isError />,
		);

		// Assert — valores em cache continuam na tela, sem fallback destrutivo
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(await screen.findAllByTitle(/dados desatualizados/i)).toHaveLength(
			4,
		);
	});

	it("HistoryKpiCards_NoError_ShouldRenderValuesWithoutStaleIndicator", () => {
		// Act
		renderWithProviders(
			<HistoryKpiCards stats={stats} isLoading={false} isError={false} />,
		);

		// Assert
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(
			screen.queryByTitle(/dados desatualizados/i),
		).not.toBeInTheDocument();
	});
});
