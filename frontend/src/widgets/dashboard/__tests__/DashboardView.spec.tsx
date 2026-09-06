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
}: {
	rooms?: MockRoom[] | "error";
	devices?: ReturnType<typeof createDeviceMock>[] | "error";
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
			HttpResponse.json(createDashboardOverviewMock()),
		),
		http.get("*/api/dashboard/activity-log", () =>
			HttpResponse.json(mockEmptyActivityLog()),
		),
		http.get("*/api/integrations/spotify/status", () =>
			HttpResponse.json({ connected: false }),
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
		// Arrange
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
	});

	it("DashboardView_DevicesFetchFails_ShouldRenderErrorStateWithRetry", async () => {
		// Arrange
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
