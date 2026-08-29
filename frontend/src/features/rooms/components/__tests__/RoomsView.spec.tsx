import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useRoomsUIStore } from "@/features/rooms/store/rooms-ui.store";
import {
	createRoomMock,
	createRoomPickerDeviceMock,
} from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { RoomsView } from "../RoomsView";

function renderRoomsView() {
	return renderWithProviders(
		<MemoryRouter>
			<RoomsView />
		</MemoryRouter>,
	);
}

function mockRoomsList(rooms: unknown[]) {
	server.use(http.get("*/api/rooms", () => HttpResponse.json(rooms)));
}

function mockAssignableDevices(devices: unknown[] = []) {
	server.use(http.get("*/api/devices", () => HttpResponse.json(devices)));
}

/** RoomDetailPanel busca essas sub-rotas assim que um ambiente é auto-selecionado. */
function mockRoomDetailSubResources() {
	server.use(
		http.get("*/api/rooms/:id/climate", () =>
			HttpResponse.json({
				hasClimateSensor: false,
				temperatureCelsius: null,
				humidityPercent: null,
				readingTimestampUtc: null,
			}),
		),
		http.get("*/api/rooms/:id/energy", () =>
			HttpResponse.json({
				hasEnergyData: false,
				chart: [],
				totalConsumptionKwh: 0,
				isEnergyEstimated: false,
			}),
		),
		http.get("*/api/rooms/:id/automations", () => HttpResponse.json([])),
		http.get("*/api/rooms/:id/events", () =>
			HttpResponse.json({ items: [], page: 1, pageSize: 8, totalCount: 0 }),
		),
	);
}

beforeEach(() => {
	useRoomsUIStore.setState({
		selectedRoomId: null,
		viewMode: "cards",
		isCreateDialogOpen: false,
		editingRoom: null,
		editDialogFocusDevices: false,
		deletingRoom: null,
	});
});

describe("RoomsView Integration Tests", () => {
	it("RoomsView_RoomsStillLoading_ShouldRenderLoadingState", () => {
		// Arrange — nunca resolve dentro do teste, mantém o estado de loading
		server.use(http.get("*/api/rooms", () => new Promise(() => {})));
		mockAssignableDevices();

		// Act
		renderRoomsView();

		// Assert
		expect(screen.getByText("Carregando ambientes...")).toBeInTheDocument();
	});

	it("RoomsView_FetchRoomsFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/rooms", () => {
				requestCount += 1;
				return HttpResponse.json({ title: "Erro" }, { status: 500 });
			}),
		);
		mockAssignableDevices();
		const user = userEvent.setup();

		// Act
		renderRoomsView();

		// Assert — useRooms() usa retry:1, o estado de erro só aparece depois
		// da 2ª tentativa (mesmo padrão de timeout usado em
		// EnergyLoadWidget.spec.tsx pro mesmo cenário no dashboard).
		expect(
			await screen.findByText(
				"Não foi possível carregar os ambientes.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetry = requestCount;

		await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

		// Assert
		await waitFor(() =>
			expect(requestCount).toBeGreaterThan(requestsBeforeRetry),
		);
	});

	it("RoomsView_NoRoomsRegistered_ShouldRenderEmptyStateWithCreateButton", async () => {
		// Arrange
		mockRoomsList([]);
		mockAssignableDevices();

		// Act
		renderRoomsView();

		// Assert
		expect(
			await screen.findByText("Nenhum ambiente ainda"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar primeiro ambiente" }),
		).toBeInTheDocument();
	});

	it("RoomsView_RoomsLoaded_ShouldAutoSelectFirstRoomAndShowDetailPanel", async () => {
		// Arrange
		const room = createRoomMock({ id: "room-01", name: "Sala de Estar" });
		const device = createRoomPickerDeviceMock({ roomId: "room-01" });
		mockRoomsList([room]);
		mockAssignableDevices([device]);
		mockRoomDetailSubResources();

		// Act
		renderRoomsView();

		// Assert — auto-seleção do primeiro ambiente (nenhum selectedRoomId prévio)
		expect(
			await screen.findByRole("heading", { name: "Sala de Estar" }),
		).toBeInTheDocument();
	});

	it("RoomsView_MultipleRooms_ShouldRenderSummaryBarWithTotalCounts", async () => {
		// Arrange
		const rooms = [
			createRoomMock({ id: "room-1", name: "Sala" }),
			createRoomMock({ id: "room-2", name: "Cozinha" }),
		];
		mockRoomsList(rooms);
		mockAssignableDevices([]);
		mockRoomDetailSubResources();

		// Act
		renderRoomsView();

		// Assert
		// "Sala" auto-seleciona e aparece tanto no item da lista quanto no
		// cabeçalho do painel de detalhes.
		await screen.findAllByText("Sala");
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("ambientes")).toBeInTheDocument();
	});
});
