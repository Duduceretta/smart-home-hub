import type { User } from "firebase/auth";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type { Room } from "@/features/rooms/types/rooms.types";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import type { DiscoveredDevice } from "../../types/devices.types";
import { DeviceTypeEnum, IntegrationTypeEnum } from "../../types/devices.types";
import { DeviceDiscoveryModal } from "../DeviceDiscoveryModal";

const mockConnection = {
	on: vi.fn(),
	off: vi.fn(),
	invoke: vi.fn().mockResolvedValue(undefined),
	start: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/core/lib/signalr", () => ({
	createSignalRConnection: () => mockConnection,
}));

function getRegisteredHandler(event: string) {
	const call = mockConnection.on.mock.calls.find(([e]) => e === event);
	return call?.[1] as ((payload: DiscoveredDevice) => void) | undefined;
}

const mockRoom: Room = {
	id: "room-01",
	name: "Sala de Estar",
	icon: null,
};

const mockDiscovered: DiscoveredDevice = {
	temporaryId: "temp-1",
	name: "Sensor Descoberto",
	brand: "ESPHome",
	externalId: "AA:BB:CC:11:22:33",
	type: DeviceTypeEnum.Sensor,
	integrationType: IntegrationTypeEnum.EspHomeMqtt,
	ipAddress: "192.168.1.42",
	macAddress: null,
	signalStrength: null,
	additionalProperties: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	mockConnection.invoke.mockResolvedValue(undefined);
	mockConnection.start.mockResolvedValue(undefined);
	mockConnection.stop.mockResolvedValue(undefined);

	server.use(
		http.get("*/api/rooms", () => {
			return HttpResponse.json([mockRoom], { status: 200 });
		}),
	);

	useDevicesUIStore.getState().closeDiscoveryModal();
	useAuthStore.setState({
		user: { uid: "test-user" } as unknown as User,
		isLoading: false,
	});
});

describe("DeviceDiscoveryModal Integration Tests", () => {
	it("DeviceDiscoveryModal_OpenModal_StartsScanAndInvokesStartDiscovery", async () => {
		renderWithProviders(<DeviceDiscoveryModal />);

		useDevicesUIStore.getState().openDiscoveryModal();

		await waitFor(() => {
			expect(mockConnection.start).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(mockConnection.invoke).toHaveBeenCalledWith("StartDiscovery", 30);
		});
	});

	it("DeviceDiscoveryModal_DeviceDiscoveredEvent_RendersDeviceInStep1List", async () => {
		renderWithProviders(<DeviceDiscoveryModal />);

		useDevicesUIStore.getState().openDiscoveryModal();

		await waitFor(() => {
			expect(getRegisteredHandler("DeviceDiscovered")).toBeDefined();
		});

		const handler = getRegisteredHandler("DeviceDiscovered");
		handler?.(mockDiscovered);

		expect(await screen.findByText("Sensor Descoberto")).toBeInTheDocument();
	});

	it("DeviceDiscoveryModal_SelectDiscoveredDevice_AdvancesToStep2WithPrefilledForm", async () => {
		const user = userEvent.setup();
		renderWithProviders(<DeviceDiscoveryModal />);

		useDevicesUIStore.getState().openDiscoveryModal();

		await waitFor(() => {
			expect(getRegisteredHandler("DeviceDiscovered")).toBeDefined();
		});
		getRegisteredHandler("DeviceDiscovered")?.(mockDiscovered);

		await user.click(await screen.findByText("Sensor Descoberto"));

		expect(await screen.findByLabelText(/Nome do Dispositivo/i)).toHaveValue(
			"Sensor Descoberto",
		);
		expect(screen.getByLabelText(/Marca \/ Modelo/i)).toHaveValue("ESPHome");
		expect(screen.getByLabelText(/Identificador Externo \/ MAC/i)).toHaveValue(
			"AA:BB:CC:11:22:33",
		);
	});

	it("DeviceDiscoveryModal_SubmitStep2Valid_ShowsSummaryOnStep3WithoutSaving", async () => {
		let postCalled = false;
		server.use(
			http.post("*/api/devices", async () => {
				postCalled = true;
				return HttpResponse.json(
					{ message: "Dispositivo criado com sucesso!", deviceId: "new-id" },
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<DeviceDiscoveryModal />);

		useDevicesUIStore.getState().openDiscoveryModal();

		await waitFor(() => {
			expect(getRegisteredHandler("DeviceDiscovered")).toBeDefined();
		});
		getRegisteredHandler("DeviceDiscovered")?.(mockDiscovered);

		await user.click(await screen.findByText("Sensor Descoberto"));

		await user.click(
			screen.getByRole("button", { name: "Revisar Dispositivo" }),
		);

		expect(
			await screen.findByText("Resumo do Dispositivo"),
		).toBeInTheDocument();
		expect(screen.getByText("AA:BB:CC:11:22:33")).toBeInTheDocument();
		expect(postCalled).toBe(false);
	});

	it("DeviceDiscoveryModal_ConfirmStep3_CallsApiAndShowsSuccess", async () => {
		let capturedBody: Record<string, unknown> | null = null;
		server.use(
			http.post("*/api/devices", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(
					{ message: "Dispositivo criado com sucesso!", deviceId: "new-id" },
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<DeviceDiscoveryModal />);

		useDevicesUIStore.getState().openDiscoveryModal();

		await waitFor(() => {
			expect(getRegisteredHandler("DeviceDiscovered")).toBeDefined();
		});
		getRegisteredHandler("DeviceDiscovered")?.(mockDiscovered);

		await user.click(await screen.findByText("Sensor Descoberto"));
		await user.click(
			screen.getByRole("button", { name: "Revisar Dispositivo" }),
		);
		await user.click(
			await screen.findByRole("button", { name: "Adicionar Dispositivo" }),
		);

		await waitFor(() => {
			expect(capturedBody).not.toBeNull();
		});
		expect(capturedBody).toMatchObject({
			name: "Sensor Descoberto",
			brand: "ESPHome",
			externalId: "AA:BB:CC:11:22:33",
		});

		expect(
			await screen.findByText("Dispositivo cadastrado!"),
		).toBeInTheDocument();
	});

	it("DeviceDiscoveryModal_CloseModal_InvokesStopDiscoveryAndStopsConnection", async () => {
		renderWithProviders(<DeviceDiscoveryModal />);

		useDevicesUIStore.getState().openDiscoveryModal();

		await waitFor(() => {
			expect(mockConnection.start).toHaveBeenCalled();
		});

		useDevicesUIStore.getState().closeDiscoveryModal();

		await waitFor(() => {
			expect(mockConnection.invoke).toHaveBeenCalledWith("StopDiscovery");
		});
		await waitFor(() => {
			expect(mockConnection.stop).toHaveBeenCalled();
		});
	});
});
