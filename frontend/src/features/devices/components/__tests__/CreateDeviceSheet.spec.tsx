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
import { CreateDeviceSheet } from "../CreateDeviceSheet";

const mockRoom: Room = {
	id: "room-01",
	name: "Sala de Estar",
	icon: null,
};

beforeEach(() => {
	server.use(
		http.get("*/api/rooms", () => {
			return HttpResponse.json([mockRoom], { status: 200 });
		}),
	);

	useDevicesUIStore.getState().openCreateSheet();
});

describe("CreateDeviceSheet Integration Tests", () => {
	it("CreateDeviceSheet_SubmitEmptyForm_ShouldDisplayZodValidationErrorsWithoutHttpRequest", async () => {
		// Arrange
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
		renderWithProviders(<CreateDeviceSheet />);

		// Act
		await user.click(screen.getByRole("button", { name: "Registrar" }));

		// Assert
		expect(
			await screen.findByText(/O nome deve ter pelo menos 2 caracteres/i),
		).toBeInTheDocument();
		expect(screen.getByText(/A marca é obrigatória/i)).toBeInTheDocument();
		expect(
			screen.getByText(/O identificador físico \(MAC\/ID\) é obrigatório/i),
		).toBeInTheDocument();
		expect(postCalled).toBe(false);
	});

	it("CreateDeviceSheet_SubmitValidForm_ShouldCallApiAndCloseSheet", async () => {
		// Arrange
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
		renderWithProviders(<CreateDeviceSheet />);

		// Act
		await user.type(
			screen.getByLabelText(/Nome do Dispositivo/i),
			"Sensor de Movimento",
		);
		await user.type(screen.getByLabelText(/Marca \/ Modelo/i), "Xiaomi");
		await user.type(
			screen.getByLabelText(/Identificador Externo \/ MAC/i),
			"AABBCC112233",
		);

		await user.click(screen.getByRole("combobox", { name: /Cômodo/i }));
		await user.click(
			await screen.findByRole("option", { name: /Sala de Estar/i }),
		);

		await user.click(screen.getByRole("button", { name: "Registrar" }));

		// Assert
		await waitFor(() => {
			expect(capturedBody).not.toBeNull();
		});
		expect(capturedBody).toMatchObject({
			name: "Sensor de Movimento",
			brand: "Xiaomi",
			externalId: "AA:BB:CC:11:22:33",
			roomId: "room-01",
		});
		await waitFor(() => {
			expect(
				screen.queryByText("Adicionar Novo Dispositivo"),
			).not.toBeInTheDocument();
		});
	});

	it("CreateDeviceSheet_SubmitConflictingDevice_ShouldDisplayProblemDetailsFeedbackAndKeepSheetOpen", async () => {
		// Arrange
		server.use(
			http.post("*/api/devices", async () => {
				return HttpResponse.json(
					{
						title: "Dispositivo Duplicado",
						status: 409,
						detail:
							"Já existe um dispositivo cadastrado com este identificador externo (MAC/ID).",
					},
					{ status: 409 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<CreateDeviceSheet />);

		// Act
		await user.type(
			screen.getByLabelText(/Nome do Dispositivo/i),
			"Sensor de Movimento",
		);
		await user.type(screen.getByLabelText(/Marca \/ Modelo/i), "Xiaomi");
		await user.type(
			screen.getByLabelText(/Identificador Externo \/ MAC/i),
			"AABBCC112233",
		);

		await user.click(screen.getByRole("button", { name: "Registrar" }));

		// Assert
		expect(
			await screen.findByText(
				/Já existe um dispositivo cadastrado com este identificador externo/i,
			),
		).toBeInTheDocument();
		expect(screen.getByText("Adicionar Novo Dispositivo")).toBeInTheDocument();
	});
});
