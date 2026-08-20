import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import type { Room } from "@/features/rooms/types/rooms.types";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import type { Device } from "../../types/devices.types";
import { DeviceTypeEnum, IntegrationTypeEnum } from "../../types/devices.types";
import { EditDeviceModal } from "../EditDeviceModal";

const mockRoom: Room = {
	id: "room-01",
	name: "Sala de Estar",
	icon: null,
};

const mockDevice: Device = {
	id: "device-01",
	name: "Lâmpada Sala",
	brand: "Philips Hue",
	externalId: "AA:BB:CC:11:22:33",
	ipAddress: "192.168.1.50",
	type: DeviceTypeEnum.Light,
	integrationType: IntegrationTypeEnum.NativeMqtt,
	category: "Iluminação",
	room: "Sala de Estar",
	roomId: "room-01",
	isOnline: true,
	isOn: true,
	lastActivityMinutes: 2,
};

beforeEach(() => {
	server.use(
		http.get("*/api/rooms", () => {
			return HttpResponse.json([mockRoom], { status: 200 });
		}),
		http.get("*/api/devices/:id", () => {
			return HttpResponse.json(mockDevice, { status: 200 });
		}),
	);

	useDevicesUIStore.getState().closeEditModal();
});

describe("EditDeviceModal Integration Tests", () => {
	it("EditDeviceModal_OpenWithDevice_RendersPrefilledForm", async () => {
		renderWithProviders(<EditDeviceModal />);

		useDevicesUIStore.getState().openEditModal(mockDevice);

		expect(await screen.findByLabelText(/Nome do Dispositivo/i)).toHaveValue(
			mockDevice.name,
		);
		expect(screen.getByLabelText(/Marca \/ Modelo/i)).toHaveValue(
			mockDevice.brand,
		);
		expect(screen.getByText("Online")).toBeInTheDocument();
	});

	it("EditDeviceModal_UpdateNameAndSubmit_CallsApiAndClosesModal", async () => {
		let capturedBody: Record<string, unknown> | null = null;
		server.use(
			http.put("*/api/devices/:id", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(
					{ ...mockDevice, name: "Lâmpada Renomeada" },
					{ status: 200 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<EditDeviceModal />);

		useDevicesUIStore.getState().openEditModal(mockDevice);

		const nameInput = await screen.findByLabelText(/Nome do Dispositivo/i);

		// Aguarda o reset() assíncrono (disparado após o GET do dispositivo)
		// terminar de propagar para o Select controlado (Radix) antes de
		// interagir — inputs não-controlados (register) recebem o valor via
		// ref imediatamente, mas o Select só reflete após um re-render.
		await waitFor(() => {
			expect(
				screen.getByRole("combobox", { name: /Tipo de Atuador/i }),
			).toHaveTextContent("Iluminação");
		});

		await user.clear(nameInput);
		await user.type(nameInput, "Lâmpada Renomeada");

		await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

		await waitFor(() => {
			expect(capturedBody).not.toBeNull();
		});
		expect(capturedBody).toMatchObject({ name: "Lâmpada Renomeada" });

		await waitFor(() => {
			expect(screen.queryByText("Editar Dispositivo")).not.toBeInTheDocument();
		});
	});

	it("EditDeviceModal_ClickDeleteButton_OpensConfirmationAndCallsDeleteApi", async () => {
		let deleteCalled = false;
		server.use(
			http.delete("*/api/devices/:id", () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<EditDeviceModal />);

		useDevicesUIStore.getState().openEditModal(mockDevice);

		await screen.findByLabelText(/Nome do Dispositivo/i);

		await user.click(
			screen.getByRole("button", { name: "Excluir Dispositivo" }),
		);

		expect(await screen.findByText("Excluir dispositivo?")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Excluir" }));

		await waitFor(() => {
			expect(deleteCalled).toBe(true);
		});
	});
});
