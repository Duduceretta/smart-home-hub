import { describe, expect, it } from "vitest";
import { renderWithProviders, screen, within } from "@/testing/test-utils";
import type { SceneMetrics } from "../../../types/scenes.types";
import { SceneMetricsPanel } from "../SceneMetricsPanel";

const metrics: SceneMetrics = {
	activationsPerDay: [2, 4, 1, 5, 3, 6, 2],
	activationsTotal: 23,
	previousActivationsTotal: 20,
	successRate: 96,
	topScenes: [
		{ sceneId: "s1", name: "Boa Noite", activations: 9 },
		{ sceneId: "s2", name: "Modo Cinema", activations: 6 },
		{ sceneId: "s3", name: "Bom Dia", activations: 5 },
	],
	peakHour: "07:15",
	lastProblem: null,
};

const noActivity: SceneMetrics = {
	activationsPerDay: [0, 0, 0, 0, 0, 0, 0],
	activationsTotal: 0,
	previousActivationsTotal: 0,
	successRate: null,
	topScenes: [],
	peakHour: null,
	lastProblem: null,
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

	describe("variação sobre a semana anterior", () => {
		const withTotals = (total: number, previous: number) => ({
			...metrics,
			activationsTotal: total,
			previousActivationsTotal: previous,
		});

		it("SceneMetricsPanel_MoreThanLastWeek_ShouldShowThePercentageUp", () => {
			renderWithProviders(<SceneMetricsPanel metrics={withTotals(23, 20)} />);

			expect(
				within(card("Ativações")).getByText("+15% vs. semana anterior"),
			).toBeInTheDocument();
		});

		it("SceneMetricsPanel_LessThanLastWeek_ShouldShowThePercentageDown", () => {
			renderWithProviders(<SceneMetricsPanel metrics={withTotals(18, 20)} />);

			expect(
				within(card("Ativações")).getByText("−10% vs. semana anterior"),
			).toBeInTheDocument();
		});

		it("SceneMetricsPanel_SameAsLastWeek_ShouldSaySo", () => {
			renderWithProviders(<SceneMetricsPanel metrics={withTotals(20, 20)} />);

			expect(
				within(card("Ativações")).getByText("igual à semana anterior"),
			).toBeInTheDocument();
		});

		it("SceneMetricsPanel_NothingLastWeek_ShouldNotInventAPercentage", () => {
			renderWithProviders(<SceneMetricsPanel metrics={withTotals(23, 0)} />);

			expect(
				within(card("Ativações")).queryByText(/semana anterior/),
			).not.toBeInTheDocument();
		});
	});

	describe("última ativação com problema", () => {
		const NOW = Date.parse("2026-10-06T12:00:00Z");
		const twoDaysAgo = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();

		it("SceneMetricsPanel_WithAProblem_ShouldNameTheSceneAndWhen", () => {
			renderWithProviders(
				<SceneMetricsPanel
					now={NOW}
					metrics={{
						...metrics,
						lastProblem: {
							sceneId: "s1",
							sceneName: "Modo Cinema",
							timestamp: twoDaysAgo,
							description: "1 offline",
						},
					}}
				/>,
			);

			expect(
				within(card("Taxa de sucesso")).getByText(
					"Último alerta: Modo Cinema · anteontem",
				),
			).toBeInTheDocument();
		});

		it("SceneMetricsPanel_ProblemOfADeletedScene_ShouldStillShowWhen", () => {
			renderWithProviders(
				<SceneMetricsPanel
					now={NOW}
					metrics={{
						...metrics,
						lastProblem: {
							sceneId: null,
							sceneName: null,
							timestamp: twoDaysAgo,
							description: "",
						},
					}}
				/>,
			);

			expect(
				within(card("Taxa de sucesso")).getByText(
					"Último alerta: uma cena · anteontem",
				),
			).toBeInTheDocument();
		});

		it("SceneMetricsPanel_NoProblem_ShouldNotShowTheLine", () => {
			renderWithProviders(<SceneMetricsPanel metrics={metrics} />);

			expect(
				within(card("Taxa de sucesso")).queryByText(/Último alerta/),
			).not.toBeInTheDocument();
		});
	});
});
