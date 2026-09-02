import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useAutomationsUIStore } from "@/features/automations/store/automations-ui.store";
import {
	createAutomationFilterCountsMock,
	createAutomationMock,
	createPickerDeviceMock,
} from "@/testing/mocks/automations.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { AutomationsView } from "../AutomationsView";

function renderAutomationsView(initialEntries = ["/automations"]) {
	return renderWithProviders(
		<MemoryRouter initialEntries={initialEntries}>
			<AutomationsView />
		</MemoryRouter>,
	);
}

function mockAutomationsBackend(automations: unknown[] = []) {
	server.use(
		http.get("*/api/devices", () =>
			HttpResponse.json([createPickerDeviceMock()]),
		),
		http.get("*/api/automations/counts", () =>
			HttpResponse.json(createAutomationFilterCountsMock()),
		),
		http.get("*/api/automations/:id/history", () =>
			HttpResponse.json({ items: [], page: 1, pageSize: 8, totalCount: 0 }),
		),
		http.get("*/api/automations/:id/executions/by-weekday", () =>
			HttpResponse.json([
				{ dayOfWeek: 0, count: 0 },
				{ dayOfWeek: 1, count: 2 },
				{ dayOfWeek: 2, count: 5 },
				{ dayOfWeek: 3, count: 1 },
				{ dayOfWeek: 4, count: 0 },
				{ dayOfWeek: 5, count: 4 },
				{ dayOfWeek: 6, count: 0 },
			]),
		),
		http.get("*/api/automations", ({ request }) => {
			const url = new URL(request.url);
			if (
				url.pathname.endsWith("/counts") ||
				url.pathname.includes("/executions/") ||
				url.pathname.endsWith("/history")
			) {
				return;
			}
			return HttpResponse.json({
				items: automations,
				page: 1,
				pageSize: 20,
				totalCount: automations.length,
				hasNextPage: false,
			});
		}),
	);
}

beforeEach(() => {
	useAutomationsUIStore.setState({
		query: "",
		filter: "all",
		sort: "name",
		viewMode: "cards",
		selectedId: null,
		isCreateWizardOpen: false,
		editingAutomation: null,
	});
});

describe("AutomationsView Integration Tests", () => {
	it("AutomationsView_StillLoading_ShouldRenderLoadingState", () => {
		// Arrange
		server.use(http.get("*/api/automations", () => new Promise(() => {})));
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json([createPickerDeviceMock()]),
			),
		);

		// Act
		renderAutomationsView();

		// Assert
		expect(screen.getByText("Carregando automações...")).toBeInTheDocument();
	});

	it("AutomationsView_FetchFails_ShouldRenderErrorStateAndRetry", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/automations", () => {
				requestCount += 1;
				return HttpResponse.json({ title: "Erro" }, { status: 500 });
			}),
		);
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json([createPickerDeviceMock()]),
			),
		);
		const user = userEvent.setup();

		// Act
		renderAutomationsView();

		// Assert
		expect(
			await screen.findByText(
				"Não foi possível carregar as automações.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();

		const initialCount = requestCount;
		await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

		await waitFor(() => expect(requestCount).toBeGreaterThan(initialCount));
	});

	it("AutomationsView_Loaded_ShouldRenderListAndSummaryCounts", async () => {
		// Arrange
		const auto1 = createAutomationMock({
			id: "auto-1",
			name: "Ligar luz da Sala",
		});
		const auto2 = createAutomationMock({
			id: "auto-2",
			name: "Desligar Ar Condicionado",
			isActive: false,
		});
		mockAutomationsBackend([auto1, auto2]);

		// Act
		renderAutomationsView();

		// Assert
		expect(await screen.findByText("Ligar luz da Sala")).toBeInTheDocument();
		expect(screen.getByText("Desligar Ar Condicionado")).toBeInTheDocument();
		expect(screen.getByText("2 automações")).toBeInTheDocument();
	});

	it("AutomationsView_WithAutomationInUrl_ShouldRenderDetailPanel", async () => {
		// Arrange
		const auto1 = createAutomationMock({
			id: "auto-target",
			name: "Automação Específica",
		});
		mockAutomationsBackend([auto1]);

		// Act
		renderAutomationsView(["/automations?automation=auto-target"]);

		// Assert
		expect(
			await screen.findByRole("heading", { name: "Automação Específica" }),
		).toBeInTheDocument();
		expect(screen.getByText("Gatilho")).toBeInTheDocument();
		expect(screen.getByText("Ações")).toBeInTheDocument();
	});

	it("AutomationsView_ClickVoltar_ShouldClearSelection", async () => {
		// Arrange
		const auto1 = createAutomationMock({
			id: "auto-target",
			name: "Automação Voltar Test",
		});
		mockAutomationsBackend([auto1]);
		const user = userEvent.setup();

		// Act
		renderAutomationsView(["/automations?automation=auto-target"]);

		// Assert detail is open
		expect(
			await screen.findByRole("heading", { name: "Automação Voltar Test" }),
		).toBeInTheDocument();

		// Click Voltar
		const backButton = screen.getByRole("button", { name: "Voltar" });
		await user.click(backButton);
	});
});
