import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { AutomationExecutionSection } from "../AutomationExecutionSection";

function mockWeekday(
	data: { dayOfWeek: number; count: number }[] = [],
	status = 200,
) {
	return http.get("*/api/automations/:id/executions/by-weekday", () =>
		status === 200
			? HttpResponse.json(data)
			: HttpResponse.json({ title: "Erro" }, { status }),
	);
}

function mockHistory(items: Record<string, unknown>[] = [], status = 200) {
	return http.get("*/api/automations/:id/history", () =>
		status === 200
			? HttpResponse.json({
					items,
					page: 1,
					pageSize: 8,
					totalCount: items.length,
				})
			: HttpResponse.json({ title: "Erro" }, { status }),
	);
}

describe("AutomationExecutionSection Integration Tests", () => {
	it("AutomationExecutionSection_BothQueriesFailWithNoCache_ShouldRenderNeutralFallbacksNotInactiveText", async () => {
		// Arrange — falha de rede não pode aparentar "nunca executada"
		server.use(mockWeekday([], 500), mockHistory([], 500));

		// Act
		renderWithProviders(<AutomationExecutionSection automationId="auto-01" />);

		// Assert
		const alerts = await screen.findAllByRole("alert", {}, { timeout: 3000 });
		expect(alerts).toHaveLength(2);
		expect(
			screen.queryByText("Nenhuma execução registrada ainda."),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Nenhuma execução registrada nos últimos 30 dias."),
		).not.toBeInTheDocument();
	});

	it("AutomationExecutionSection_HistoryFailsWithNoCache_RetryRestoresContent", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			mockWeekday([{ dayOfWeek: 1, count: 3 }]),
			http.get("*/api/automations/:id/history", () => {
				requestCount += 1;
				// useAutomationExecutionHistory tem retry:1 — falha 2x (inicial +
				// retry automático), sucede só na 3ª (clique manual).
				if (requestCount <= 2) {
					return HttpResponse.json({ title: "Erro" }, { status: 500 });
				}
				return HttpResponse.json({
					items: [
						{
							id: "exec-1",
							deviceId: null,
							eventType: "AutomationExecuted",
							title: "Execução concluída",
							description: "Disparado por horário",
							timestamp: "2026-09-06T10:00:00Z",
							isAlert: false,
						},
					],
					page: 1,
					pageSize: 8,
					totalCount: 1,
				});
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(<AutomationExecutionSection automationId="auto-01" />);
		await screen.findByRole("alert", {}, { timeout: 3000 });
		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		// Assert
		expect(await screen.findByText("Execução concluída")).toBeInTheDocument();
	});

	it("AutomationExecutionSection_BackgroundRefetchFailsWithCache_ShouldKeepChartAndShowStaleIndicators", async () => {
		// Arrange — 1ª carga bem-sucedida, popula cache
		server.use(
			mockWeekday([{ dayOfWeek: 1, count: 3 }]),
			mockHistory([
				{
					id: "exec-1",
					deviceId: null,
					eventType: "AutomationExecuted",
					title: "Execução concluída",
					description: "Disparado por horário",
					timestamp: "2026-09-06T10:00:00Z",
					isAlert: false,
				},
			]),
		);
		const { queryClient } = renderWithProviders(
			<AutomationExecutionSection automationId="auto-01" />,
		);
		await screen.findByText("Execução concluída");

		// Act — refetch em background falha nas duas queries
		server.use(mockWeekday([], 500), mockHistory([], 500));
		await queryClient.refetchQueries();

		// Assert — conteúdo em cache permanece, com indicador discreto
		expect(
			await screen.findAllByTitle(
				/dados desatualizados/i,
				{},
				{ timeout: 3000 },
			),
		).toHaveLength(2);
		expect(screen.getByText("Execução concluída")).toBeInTheDocument();
	});
});
