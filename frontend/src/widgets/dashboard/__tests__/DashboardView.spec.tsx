import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardPreviewStore } from "@/features/dashboard/store/dashboard-preview.store";
import { useDevicesUIStore } from "@/features/devices/store/devices-ui.store";
import { DeviceTypeEnum } from "@/features/devices/types/devices.types";
import { createDashboardOverviewMock } from "@/testing/mocks/dashboard.mock";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { DashboardView } from "../DashboardView";

interface MockRoom {
	id: string;
	name: string;
	icon: string | null;
}

const room: MockRoom = { id: "room-01", name: "Sala de Estar", icon: "sofa" };

const lamp = createDeviceMock({
	id: "device-lamp",
	name: "Lâmpada da Sala",
	type: DeviceTypeEnum.Light,
	roomId: "room-01",
});
const unassignedSensor = createDeviceMock({
	id: "device-sensor",
	name: "Sensor de Presença",
	type: DeviceTypeEnum.Sensor,
	roomId: null,
});

function mockPagedDevices(items: ReturnType<typeof createDeviceMock>[]) {
	return {
		items,
		page: 1,
		pageSize: 200,
		totalCount: items.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

function mockEmptyActivityLog() {
	return {
		items: [],
		page: 1,
		pageSize: 5,
		totalCount: 0,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

function useDefaultHandlers({
	rooms = [room],
	devices = [lamp, unassignedSensor],
	automations = [],
	overview = "success",
	activityLog = "success",
}: {
	rooms?: MockRoom[] | "error";
	devices?: ReturnType<typeof createDeviceMock>[] | "error";
	/** `/api/automations` (consumida por `useRecentAutomations`, dentro de
	 * `ActiveAutomationsCard`) — precisa de baseline de sucesso explícito,
	 * senão vira uma 2ª query falhando e qualquer teste de erro isolado
	 * (1 query) vira sistêmico (2+ queries) sem querer. */
	automations?: unknown[] | "error";
	overview?: "success" | "error";
	activityLog?: "success" | "error";
} = {}) {
	server.use(
		http.get("*/api/rooms", () =>
			rooms === "error"
				? HttpResponse.json({ title: "Erro" }, { status: 500 })
				: HttpResponse.json(rooms),
		),
		http.get("*/api/devices", () =>
			devices === "error"
				? HttpResponse.json({ title: "Erro" }, { status: 500 })
				: HttpResponse.json(mockPagedDevices(devices)),
		),
		http.get("*/api/dashboard/overview", () =>
			overview === "error"
				? HttpResponse.json({ title: "Erro" }, { status: 500 })
				: HttpResponse.json(createDashboardOverviewMock()),
		),
		http.get("*/api/dashboard/activity-log", () =>
			activityLog === "error"
				? HttpResponse.json({ title: "Erro" }, { status: 500 })
				: HttpResponse.json(mockEmptyActivityLog()),
		),
		http.get("*/api/integrations/spotify/status", () =>
			HttpResponse.json({ connected: false }),
		),
		http.get("*/api/automations", () =>
			automations === "error"
				? HttpResponse.json({ title: "Erro" }, { status: 500 })
				: HttpResponse.json({ items: automations, totalPages: 1 }),
		),
	);
}

function renderDashboard() {
	return renderWithProviders(
		<MemoryRouter>
			<DashboardView />
		</MemoryRouter>,
	);
}

describe("DashboardView Integration Tests", () => {
	beforeEach(() => {
		useDashboardPreviewStore.setState({
			overridesByRoom: {},
			expandedByRoom: {},
		});
		useDevicesUIStore.setState({ selectedRoomId: null });
		localStorage.clear();
	});

	it("DashboardView_RoomsAndDevicesLoaded_ShouldGroupDevicesByRoomAndUnassignedBucket", async () => {
		// Arrange
		useDefaultHandlers();

		// Act
		renderDashboard();

		// Assert
		expect(await screen.findByText("Sala de Estar")).toBeInTheDocument();
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
		expect(screen.getByText("Sem Ambiente")).toBeInTheDocument();
		expect(screen.getByText("Sensor de Presença")).toBeInTheDocument();
	});

	it("DashboardView_RoomWithNoDevices_ShouldNotRenderThatRoomSection", async () => {
		// Arrange — sala cadastrada mas sem nenhum dispositivo vinculado
		useDefaultHandlers({
			rooms: [room, { id: "room-02", name: "Escritório", icon: null }],
		});

		// Act
		renderDashboard();

		// Assert
		expect(await screen.findByText("Sala de Estar")).toBeInTheDocument();
		expect(screen.queryByText("Escritório")).not.toBeInTheDocument();
	});

	it("DashboardView_NoDevicesAtAll_ShouldRenderZeroRoomSections", async () => {
		// Arrange
		useDefaultHandlers({ rooms: [room], devices: [] });

		// Act
		renderDashboard();

		// Assert — espera o loading terminar (chips com contagem 0) antes de
		// afirmar a ausência de seções. Label e contagem são <span>s
		// separados dentro do botão, não um texto único "TODOS (0)".
		expect(
			await screen.findByRole("button", { name: /TODOS/i }),
		).toBeInTheDocument();
		expect(screen.queryByText("Sala de Estar")).not.toBeInTheDocument();
		expect(screen.queryByText("Sem Ambiente")).not.toBeInTheDocument();
	});

	it("DashboardView_ClickLightsFilterChip_ShouldHideDevicesOfOtherTypes", async () => {
		// Arrange
		useDefaultHandlers();
		const user = userEvent.setup();
		renderDashboard();
		await screen.findByText("Lâmpada da Sala");

		// Act
		await user.click(screen.getByText(/LUZES/));

		// Assert
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
		expect(screen.queryByText("Sensor de Presença")).not.toBeInTheDocument();
	});

	it("DashboardView_RoomsFetchFails_ShouldRenderErrorStateWithRetry", async () => {
		// Arrange — só 1 query falhando (rooms) — deve ser tratado como LOCAL
		useDefaultHandlers({ rooms: "error" });

		// Act
		renderDashboard();

		// Assert
		expect(
			await screen.findByText(
				/não foi possível carregar os ambientes e dispositivos/i,
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/não foi possível conectar ao servidor/i),
		).not.toBeInTheDocument();
	});

	it("DashboardView_DevicesFetchFails_ShouldRenderErrorStateWithRetry", async () => {
		// Arrange — só 1 query falhando (devices) — deve ser tratado como LOCAL
		useDefaultHandlers({ devices: "error" });

		// Act
		renderDashboard();

		// Assert
		expect(
			await screen.findByText(
				/não foi possível carregar os ambientes e dispositivos/i,
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/não foi possível conectar ao servidor/i),
		).not.toBeInTheDocument();
	});

	it("DashboardView_TwoQueriesFail_ShouldShowSystemicBannerAndSuppressLocalFallbacks", async () => {
		// Arrange — rooms E automations falhando ao mesmo tempo (2 queries
		// independentes) — sintoma de outage, deve consolidar num banner só
		// em vez de 2 fallbacks locais fragmentados.
		let roomsRequestCount = 0;
		let automationsRequestCount = 0;
		server.use(
			http.get("*/api/rooms", () => {
				roomsRequestCount += 1;
				return HttpResponse.json({ title: "Erro" }, { status: 500 });
			}),
			http.get("*/api/devices", () =>
				HttpResponse.json(mockPagedDevices([lamp, unassignedSensor])),
			),
			http.get("*/api/dashboard/overview", () =>
				HttpResponse.json(createDashboardOverviewMock()),
			),
			http.get("*/api/dashboard/activity-log", () =>
				HttpResponse.json(mockEmptyActivityLog()),
			),
			http.get("*/api/integrations/spotify/status", () =>
				HttpResponse.json({ connected: false }),
			),
			http.get("*/api/automations", () => {
				automationsRequestCount += 1;
				return HttpResponse.json({ title: "Erro" }, { status: 500 });
			}),
		);
		const user = userEvent.setup();

		// Act
		renderDashboard();

		// Assert — banner consolidado aparece
		expect(
			await screen.findByText(
				/não foi possível conectar ao servidor/i,
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();

		// Assert — fallbacks locais individuais NÃO aparecem (supressos)
		expect(
			screen.queryByText(
				/não foi possível carregar os ambientes e dispositivos/i,
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/não foi possível carregar as automações/i),
		).not.toBeInTheDocument();

		// Só existe 1 botão de retry na tela (o do banner)
		const retryButtons = screen.getAllByRole("button", {
			name: /tentar novamente/i,
		});
		expect(retryButtons).toHaveLength(1);

		const roomsRequestsBeforeRetry = roomsRequestCount;
		const automationsRequestsBeforeRetry = automationsRequestCount;

		// Act — clica no retry único do banner
		await user.click(retryButtons[0]);

		// Assert — dispara refetch de AMBAS as queries afetadas
		await waitFor(() => {
			expect(roomsRequestCount).toBeGreaterThan(roomsRequestsBeforeRetry);
		});
		expect(automationsRequestCount).toBeGreaterThan(
			automationsRequestsBeforeRetry,
		);
	});

	it("DashboardView_TwoQueriesFailWithCachePresent_ShouldNotShowSystemicBanner", async () => {
		// Arrange — tudo sucede primeiro, populando o cache das 5 queries
		useDefaultHandlers();
		const { queryClient } = renderDashboard();
		await screen.findByText("Sala de Estar");

		// Act — rooms e devices passam a falhar em background (refetch), mas
		// ambas já têm cache válido — stale-while-revalidate, não outage
		server.use(
			http.get("*/api/rooms", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
			http.get("*/api/devices", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);
		await queryClient.refetchQueries();

		// Assert — SEM banner sistêmico; conteúdo continua normal (do cache)
		await waitFor(() => {
			expect(
				screen.queryByText(/não foi possível conectar ao servidor/i),
			).not.toBeInTheDocument();
		});
		expect(screen.getByText("Sala de Estar")).toBeInTheDocument();
	});

	it("DashboardView_SystemicFailureRecovers_ShouldRemoveBannerAndRestoreContentWithoutReload", async () => {
		// Arrange — rooms e automations falham na 1ª chamada, sucesso a partir da 2ª
		let roomsCallCount = 0;
		let automationsCallCount = 0;
		server.use(
			// useRooms tem `retry: 1` — falha nas 2 primeiras chamadas (a
			// inicial + o retry automático do próprio TanStack Query) e só
			// sucede a partir da 3ª (o clique manual no banner).
			http.get("*/api/rooms", () => {
				roomsCallCount += 1;
				return roomsCallCount <= 2
					? HttpResponse.json({ title: "Erro" }, { status: 500 })
					: HttpResponse.json([room]);
			}),
			http.get("*/api/devices", () =>
				HttpResponse.json(mockPagedDevices([lamp, unassignedSensor])),
			),
			http.get("*/api/dashboard/overview", () =>
				HttpResponse.json(createDashboardOverviewMock()),
			),
			http.get("*/api/dashboard/activity-log", () =>
				HttpResponse.json(mockEmptyActivityLog()),
			),
			http.get("*/api/integrations/spotify/status", () =>
				HttpResponse.json({ connected: false }),
			),
			http.get("*/api/automations", () => {
				automationsCallCount += 1;
				return automationsCallCount === 1
					? HttpResponse.json({ title: "Erro" }, { status: 500 })
					: HttpResponse.json({ items: [], totalPages: 1 });
			}),
		);
		const user = userEvent.setup();

		// Act
		renderDashboard();
		await screen.findByText(
			/não foi possível conectar ao servidor/i,
			{},
			{ timeout: 3000 },
		);
		await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

		// Assert — banner some e conteúdo real volta, sem reload de página
		await waitFor(() => {
			expect(
				screen.queryByText(/não foi possível conectar ao servidor/i),
			).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Sala de Estar")).toBeInTheDocument();
	});

	it("DashboardView_ClickCollapseAll_ShouldHideEveryRoomSectionDeviceList", async () => {
		// Arrange
		useDefaultHandlers();
		const user = userEvent.setup();
		renderDashboard();
		await screen.findByText("Lâmpada da Sala");

		// Act
		await user.click(screen.getByRole("button", { name: /recolher todos/i }));

		// Assert
		await waitFor(() => {
			expect(screen.queryByText("Lâmpada da Sala")).not.toBeInTheDocument();
		});
		expect(screen.queryByText("Sensor de Presença")).not.toBeInTheDocument();
	});
});
