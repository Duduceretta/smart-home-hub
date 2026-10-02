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

const noActivity: SceneMetrics = {
	activationsPerDay: [0, 0, 0, 0, 0, 0, 0],
	activationsTotal: 0,
	successRate: null,
	topScenes: [],
	peakHour: null,
};

const panel = () => screen.getByRole("region", { name: "Desempenho" });
const card = (name: string) => within(panel()).getByRole("region", { name });

describe("SceneMetricsPanel", () => {
	it("SceneMetricsPanel_Always_ShouldShowTheFourMetricCards", () => {
		renderWithProviders(<SceneMetricsPanel metrics={null} />);

		for (const title of [
			"Ativações",
			"Taxa de sucesso",
			"Mais ativadas",
			"Horário de pico",
		]) {
			expect(card(title)).toBeInTheDocument();
		}
	});

	it("SceneMetricsPanel_WithoutData_ShouldGiveEveryCardItsOwnEmptyState", () => {
		renderWithProviders(<SceneMetricsPanel metrics={null} />);

		for (const title of [
			"Ativações",
			"Taxa de sucesso",
			"Mais ativadas",
			"Horário de pico",
		]) {
			expect(
				within(card(title)).getByText("Ainda não há dados"),
			).toBeInTheDocument();
		}
	});

	it("SceneMetricsPanel_ZeroActivations_ShouldBehaveAsNoDataInsteadOfShowingZeros", () => {
		renderWithProviders(<SceneMetricsPanel metrics={noActivity} />);

		expect(
			within(card("Ativações")).getByText("Ainda não há dados"),
		).toBeInTheDocument();
		expect(
			within(card("Taxa de sucesso")).queryByText("0%"),
		).not.toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldShowTheTotalOfActivations", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		const activations = card("Ativações");
		expect(within(activations).getByText("23")).toBeInTheDocument();
		expect(
			within(activations).queryByText("Ainda não há dados"),
		).not.toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldDescribeTheDailyChartForScreenReaders", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		expect(
			within(card("Ativações")).getByRole("figure", {
				name: "Ativações por dia nos últimos 7 dias: 2, 4, 1, 5, 3, 6, 2",
			}),
		).toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldShowTheSuccessRate", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		const success = card("Taxa de sucesso");
		expect(within(success).getByText("96%")).toBeInTheDocument();
		expect(
			within(success).getByRole("figure", { name: "Taxa de sucesso: 96%" }),
		).toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldRankTheMostActivatedScenes", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		const items = within(
			within(card("Mais ativadas")).getByRole("list", {
				name: "Mais ativadas",
			}),
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

		expect(
			within(card("Mais ativadas")).getByText("1 ativação"),
		).toBeInTheDocument();
	});

	it("SceneMetricsPanel_WithData_ShouldShowThePeakHour", () => {
		renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

		expect(
			within(card("Horário de pico")).getByText("07:15"),
		).toBeInTheDocument();
	});

	it("SceneMetricsPanel_DataButNoPeakHourYet_ShouldOnlyEmptyThatCard", () => {
		renderWithProviders(
			<SceneMetricsPanel metrics={{ ...metrics, peakHour: null }} />,
		);

		expect(
			within(card("Horário de pico")).getByText("Ainda não há dados"),
		).toBeInTheDocument();
		expect(within(card("Ativações")).getByText("23")).toBeInTheDocument();
	});
});
