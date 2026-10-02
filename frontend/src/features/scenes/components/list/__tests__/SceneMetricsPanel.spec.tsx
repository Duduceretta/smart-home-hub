import { describe, expect, it } from "vitest";
import { renderWithProviders, screen, within } from "@/testing/test-utils";
import type { SceneMetrics } from "../../../types/scenes.types";
import { SceneMetricsPanel } from "../SceneMetricsPanel";

const metrics: SceneMetrics = {
	activationsPerDay: [2, 4, 1, 5, 3, 6, 2],
	activationsTotal: 23,
	successRate: 96,
	topScenes: [
		{ sceneId: "s1", name: "Boa Noite", activations: 9 },
		{ sceneId: "s2", name: "Modo Cinema", activations: 6 },
		{ sceneId: "s3", name: "Bom Dia", activations: 5 },
	],
	peakHour: "07:15",
};

const panel = () => screen.getByRole("region", { name: "Desempenho" });

describe("SceneMetricsPanel", () => {
	it("SceneMetricsPanel_WithoutData_ShouldStillShowEveryMetricWithAnEmptyState", () => {
		renderWithProviders(<SceneMetricsPanel metrics={null} />);

		const region = panel();
		expect(within(region).getByText("Ativações")).toBeInTheDocument();
		expect(within(region).getByText("Taxa de sucesso")).toBeInTheDocument();
		expect(within(region).getByText("Mais ativadas")).toBeInTheDocument();
		expect(within(region).getByText("Horário de pico")).toBeInTheDocument();
		expect(within(region).getAllByText("—").length).toBeGreaterThanOrEqual(3);
		expect(
			within(region).getByText(
				"Ainda não há dados para mostrar. As métricas de uso aparecem aqui.",
			),
		).toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldShowTheValues", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		const region = panel();
		expect(within(region).getByText("23")).toBeInTheDocument();
		expect(within(region).getByText("96%")).toBeInTheDocument();
		expect(within(region).getByText("07:15")).toBeInTheDocument();
		expect(
			within(region).queryByText(
				"Ainda não há dados para mostrar. As métricas de uso aparecem aqui.",
			),
		).not.toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldRankTheMostActivatedScenes", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		const items = within(
			within(panel()).getByRole("list", { name: "Mais ativadas" }),
		).getAllByRole("listitem");

		expect(items.map((item) => item.textContent)).toEqual([
			"Boa Noite9 ativações",
			"Modo Cinema6 ativações",
			"Bom Dia5 ativações",
		]);
	});

	it("SceneMetricsPanel_OneActivation_ShouldUseTheSingularWording", () => {
		renderWithProviders(
			<SceneMetricsPanel
				metrics={{
					...metrics,
					topScenes: [{ sceneId: "s1", name: "Boa Noite", activations: 1 }],
				}}
			/>,
		);

		expect(within(panel()).getByText("1 ativação")).toBeInTheDocument();
	});

	it("SceneMetricsPanel_ZeroActivations_ShouldShowTheEmptyStateInsteadOfMisleadingZeros", () => {
		renderWithProviders(
			<SceneMetricsPanel
				metrics={{
					activationsPerDay: [0, 0, 0, 0, 0, 0, 0],
					activationsTotal: 0,
					successRate: null,
					topScenes: [],
					peakHour: null,
				}}
			/>,
		);

		expect(
			within(panel()).getByText(
				"Ainda não há dados para mostrar. As métricas de uso aparecem aqui.",
			),
		).toBeInTheDocument();
		expect(within(panel()).queryByText("0%")).not.toBeInTheDocument();
	});

	it("SceneMetricsPanel_Chart_ShouldDescribeTheLast7DaysForScreenReaders", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		expect(
			within(panel()).getByRole("img", {
				name: "Ativações por dia nos últimos 7 dias: 2, 4, 1, 5, 3, 6, 2",
			}),
		).toBeInTheDocument();
	});
});
