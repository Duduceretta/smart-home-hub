import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryUIStore } from "@/features/history/store/history-ui.store";
import { createHistoryEventMock } from "@/testing/mocks/history.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { HistoryView } from "../HistoryView";

function renderHistoryView() {
	return renderWithProviders(
		<MemoryRouter>
			<HistoryView />
		</MemoryRouter>,
	);
}

function mockHistoryResponse(items: unknown[] = [], totalCount = items.length) {
	server.use(
		http.get("*/api/history", () =>
			HttpResponse.json({
				items,
				page: 1,
				pageSize: 20,
				totalCount,
				totalPages: Math.ceil(totalCount / 20) || 1,
				hasNextPage: false,
				hasPreviousPage: false,
			}),
		),
	);
}

beforeEach(() => {
	useHistoryUIStore.setState({
		searchQuery: "",
		selectedSeverity: "all",
		selectedSource: "all",
		timeframe: "7d",
		customStartDateUtc: null,
		customEndDateUtc: null,
		page: 1,
		pageSize: 20,
		selectedEvent: null,
		expandedEventIds: [],
	});
});

describe("HistoryView Integration Tests", () => {
	it("HistoryView_EventsLoading_ShouldRenderSkeleton", () => {
		// Arrange
		server.use(http.get("*/api/history", () => new Promise(() => {})));

		// Act
		const { container } = renderHistoryView();

		// Assert
		expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
	});

	it("HistoryView_FetchFails_ShouldRenderErrorCardWithRetry", async () => {
		// Arrange
		let retryCalled = false;
		server.use(
			http.get("*/api/history", () => {
				if (!retryCalled) {
					return HttpResponse.json({ title: "Erro" }, { status: 500 });
				}
				return HttpResponse.json({
					items: [],
					page: 1,
					pageSize: 20,
					totalCount: 0,
					totalPages: 1,
				});
			}),
		);
		const user = userEvent.setup();

		// Act
		renderHistoryView();

		// Assert
		expect(
			await screen.findByText("Erro ao carregar o histórico"),
		).toBeInTheDocument();

		retryCalled = true;
		await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

		// Assert
		expect(
			await screen.findByText("Nenhum evento encontrado"),
		).toBeInTheDocument();
	});

	it("HistoryView_EmptyResponse_ShouldRenderEmptyState", async () => {
		// Arrange
		mockHistoryResponse([]);

		// Act
		renderHistoryView();

		// Assert
		expect(
			await screen.findByText("Nenhum evento encontrado"),
		).toBeInTheDocument();
	});

	it("HistoryView_WithEvents_ShouldRenderKpisAndTimelineRows", async () => {
		// Arrange
		const events = [
			createHistoryEventMock({
				id: "ev-1",
				description: "Smart Lâmpada ligada via Modo Noite",
				source: "Automation",
				severity: "Info",
			}),
			createHistoryEventMock({
				id: "ev-2",
				description: "Timeout TCP no polling",
				deviceName: "Smart-TV-Pro",
				source: "System",
				severity: "Warning",
			}),
			createHistoryEventMock({
				id: "ev-3",
				description: "Grupo Luzes acionado",
				deviceGroupName: "Todas as Luzes",
				source: "DeviceGroup",
				severity: "Info",
			}),
		];
		mockHistoryResponse(events, 3);

		// Act
		renderHistoryView();

		// Assert
		expect(
			await screen.findByText("Smart Lâmpada ligada via Modo Noite"),
		).toBeInTheDocument();
		expect(screen.getByText("Timeout TCP no polling")).toBeInTheDocument();
		expect(screen.getByText("Grupo Luzes acionado")).toBeInTheDocument();
		expect(screen.getByText(/Smart-TV-Pro/)).toBeInTheDocument();
	});

	it("HistoryView_ClickMultipleEventRows_ShouldAllowMultipleOpenSimultaneously", async () => {
		// Arrange
		const event1 = createHistoryEventMock({
			id: "ev-multi-1",
			description: "Lâmpada 1 ligada",
			source: "Automation",
			severity: "Info",
			oldValue: "off",
			newValue: "on",
		});
		const event2 = createHistoryEventMock({
			id: "ev-multi-2",
			description: "Lâmpada 2 ligada",
			source: "UserManual",
			severity: "Info",
			oldValue: "off",
			newValue: "on",
		});
		mockHistoryResponse([event1, event2], 2);
		const user = userEvent.setup();

		// Act
		renderHistoryView();
		const row1 = await screen.findByText("Lâmpada 1 ligada");
		const row2 = await screen.findByText("Lâmpada 2 ligada");

		// Click row1 to expand
		await user.click(row1);
		expect(screen.getByText(/ev-multi-1/)).toBeInTheDocument();
		expect(useHistoryUIStore.getState().expandedEventIds).toContain(
			"ev-multi-1",
		);

		// Click row2 to expand (both should now be open!)
		await user.click(row2);
		expect(screen.getByText(/ev-multi-1/)).toBeInTheDocument();
		expect(screen.getByText(/ev-multi-2/)).toBeInTheDocument();
		expect(useHistoryUIStore.getState().expandedEventIds).toEqual([
			"ev-multi-1",
			"ev-multi-2",
		]);

		// Click row1 again to collapse (row2 remains open)
		await user.click(row1);
		expect(screen.queryByText(/ev-multi-1/)).not.toBeInTheDocument();
		expect(screen.getByText(/ev-multi-2/)).toBeInTheDocument();
		expect(useHistoryUIStore.getState().expandedEventIds).toEqual([
			"ev-multi-2",
		]);
	});

	it("HistoryView_ToggleExpandAll_ShouldExpandAndCollapseAllRows", async () => {
		// Arrange
		const event1 = createHistoryEventMock({
			id: "ev-exp-1",
			description: "Evento 1",
		});
		const event2 = createHistoryEventMock({
			id: "ev-exp-2",
			description: "Evento 2",
		});
		mockHistoryResponse([event1, event2], 2);
		const user = userEvent.setup();

		// Act
		renderHistoryView();
		await screen.findByText("Evento 1");

		const expandAllButton = screen.getByRole("button", {
			name: /expandir todos/i,
		});

		// Click Expand All
		await user.click(expandAllButton);
		expect(useHistoryUIStore.getState().expandedEventIds).toEqual([
			"ev-exp-1",
			"ev-exp-2",
		]);
		expect(screen.getByText(/ev-exp-1/)).toBeInTheDocument();
		expect(screen.getByText(/ev-exp-2/)).toBeInTheDocument();

		// Click Collapse All
		const collapseAllButton = screen.getByRole("button", {
			name: /recolher todos/i,
		});
		await user.click(collapseAllButton);
		expect(useHistoryUIStore.getState().expandedEventIds).toEqual([]);
	});

	it("HistoryView_ClickRefreshButton_ShouldRefetchEvenIfSignalRDisconnected", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/history", () => {
				requestCount++;
				return HttpResponse.json({
					items: [
						createHistoryEventMock({
							id: `ev-refetch-${requestCount}`,
							description: `Evento após refresh ${requestCount}`,
						}),
					],
					page: 1,
					pageSize: 20,
					totalCount: 1,
					totalPages: 1,
				});
			}),
		);
		const user = userEvent.setup();

		// Act
		renderHistoryView();
		expect(
			await screen.findByText("Evento após refresh 1"),
		).toBeInTheDocument();

		const refreshButton = screen.getByRole("button", { name: /atualizar/i });
		await user.click(refreshButton);

		// Assert
		expect(
			await screen.findByText("Evento após refresh 2"),
		).toBeInTheDocument();
		expect(requestCount).toBe(2);
	});

	it("HistoryView_WithReturnToState_ShouldRenderReturnButton", async () => {
		// Arrange
		mockHistoryResponse([]);

		// Act
		renderWithProviders(
			<MemoryRouter
				initialEntries={[
					{
						pathname: "/history",
						state: { returnTo: "/dashboard", returnLabel: "Início" },
					},
				]}
			>
				<HistoryView />
			</MemoryRouter>,
		);

		// Assert
		expect(
			await screen.findByRole("button", { name: /voltar para início/i }),
		).toBeInTheDocument();
	});
});
