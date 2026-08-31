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
		expect(screen.getByText("Smart-TV-Pro")).toBeInTheDocument();
	});

	it("HistoryView_ClickEventRow_ShouldOpenDetailModal", async () => {
		// Arrange
		const event = createHistoryEventMock({
			id: "ev-modal-12345",
			description: "Lâmpada ligada via automação",
			deviceName: "Lâmpada do Corredor",
			source: "Automation",
			severity: "Info",
			oldValue: "off",
			newValue: "on",
		});
		mockHistoryResponse([event], 1);
		const user = userEvent.setup();

		// Act
		renderHistoryView();
		const row = await screen.findByText("Lâmpada ligada via automação");
		await user.click(row);

		// Assert
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Detalhes do Evento")).toBeInTheDocument();
		expect(screen.getByText("ev-modal-12345")).toBeInTheDocument();
		expect(
			screen.getAllByText("Lâmpada do Corredor").length,
		).toBeGreaterThanOrEqual(1);
	});
});
