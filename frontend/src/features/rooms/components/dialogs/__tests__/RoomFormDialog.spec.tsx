import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
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
	within,
} from "@/testing/test-utils";
import { useRoomsUIStore } from "../../../store/rooms-ui.store";
import { RoomFormDialog } from "../RoomFormDialog";

beforeEach(() => {
	server.use(
		http.get("*/api/devices", () => HttpResponse.json([], { status: 200 })),
	);

	useRoomsUIStore.getState().closeFormDialog();
});

describe("RoomFormDialog Integration Tests", () => {
	it("RoomFormDialog_OpenInCreateMode_RendersEmptyFormWithDefaultIcon", async () => {
		renderWithProviders(<RoomFormDialog />);

		useRoomsUIStore.getState().openCreateDialog();

		expect(await screen.findByText("Novo Ambiente")).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/Sala de Estar, Cozinha/i)).toHaveValue(
			"",
		);
		expect(
			screen.getByRole("button", { name: "Sala de Estar" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("RoomFormDialog_SubmitWithEmptyName_ShowsValidationErrorAndDoesNotCallApi", async () => {
		let postCalled = false;
		server.use(
			http.post("*/api/rooms", async () => {
				postCalled = true;
				return HttpResponse.json(
					{ message: "Ambiente criado com sucesso!", roomId: "new-id" },
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<RoomFormDialog />);
		useRoomsUIStore.getState().openCreateDialog();

		await screen.findByText("Novo Ambiente");
		await user.click(screen.getByRole("button", { name: "Criar Ambiente" }));

		expect(
			await screen.findByText("O nome do ambiente é obrigatório."),
		).toBeInTheDocument();
		expect(postCalled).toBe(false);
	});

	it("RoomFormDialog_SubmitValidNameInCreateMode_CallsCreateApiAndClosesDialog", async () => {
		let capturedBody: Record<string, unknown> | null = null;
		server.use(
			http.post("*/api/rooms", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(
					{ message: "Ambiente criado com sucesso!", roomId: "new-id" },
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<RoomFormDialog />);
		useRoomsUIStore.getState().openCreateDialog();

		await screen.findByText("Novo Ambiente");
		await user.type(
			screen.getByPlaceholderText(/Sala de Estar, Cozinha/i),
			"Escritório",
		);
		await user.click(screen.getByRole("button", { name: "Criar Ambiente" }));

		await waitFor(() => {
			expect(capturedBody).not.toBeNull();
		});
		expect(capturedBody).toMatchObject({ name: "Escritório", icon: "chair" });

		await waitFor(() => {
			expect(screen.queryByText("Novo Ambiente")).not.toBeInTheDocument();
		});
	});

	it("RoomFormDialog_SelectDifferentIcon_TogglesAriaPressedBetweenButtons", async () => {
		const user = userEvent.setup();
		renderWithProviders(<RoomFormDialog />);
		useRoomsUIStore.getState().openCreateDialog();

		await screen.findByText("Novo Ambiente");
		const chairButton = screen.getByRole("button", { name: "Sala de Estar" });
		const bedButton = screen.getByRole("button", { name: "Quarto" });

		expect(chairButton).toHaveAttribute("aria-pressed", "true");
		expect(bedButton).toHaveAttribute("aria-pressed", "false");

		await user.click(bedButton);

		expect(bedButton).toHaveAttribute("aria-pressed", "true");
		expect(chairButton).toHaveAttribute("aria-pressed", "false");
	});

	it("RoomFormDialog_OpenInEditMode_PrefillsNameIconAndAssignedDevice", async () => {
		const editingRoom = createRoomMock({
			id: "room-edit-01",
			name: "Cozinha",
			icon: "restaurant",
		});
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					[
						createRoomPickerDeviceMock({
							id: "device-in-room",
							name: "Forno Elétrico",
							roomId: editingRoom.id,
						}),
					],
					{ status: 200 },
				),
			),
		);

		renderWithProviders(<RoomFormDialog />);
		useRoomsUIStore.getState().openEditDialog(editingRoom);

		expect(await screen.findByText("Editar Ambiente")).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/Sala de Estar, Cozinha/i)).toHaveValue(
			"Cozinha",
		);
		expect(screen.getByRole("button", { name: "Cozinha" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		const deviceCheckbox = await screen.findByRole("checkbox", {
			name: /Forno Elétrico/i,
		});
		expect(deviceCheckbox).toBeChecked();
	});

	it("RoomFormDialog_SubmitValidNameInEditMode_CallsUpdateApiAndClosesDialog", async () => {
		const editingRoom = createRoomMock({ id: "room-edit-02", name: "Cozinha" });
		let capturedBody: Record<string, unknown> | null = null;
		server.use(
			http.put("*/api/rooms/room-edit-02", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(
					{ ...editingRoom, name: "Cozinha Gourmet" },
					{ status: 200 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<RoomFormDialog />);
		useRoomsUIStore.getState().openEditDialog(editingRoom);

		const nameInput = await screen.findByPlaceholderText(
			/Sala de Estar, Cozinha/i,
		);
		await user.clear(nameInput);
		await user.type(nameInput, "Cozinha Gourmet");
		await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

		await waitFor(() => {
			expect(capturedBody).not.toBeNull();
		});
		expect(capturedBody).toMatchObject({ name: "Cozinha Gourmet" });

		await waitFor(() => {
			expect(screen.queryByText("Editar Ambiente")).not.toBeInTheDocument();
		});
	});

	describe("descarte de alterações", () => {
		it("RoomFormDialog_CancelWithUnsavedChangesAndConfirmDiscard_ClosesDialog", async () => {
			const user = userEvent.setup();
			renderWithProviders(<RoomFormDialog />);
			useRoomsUIStore.getState().openCreateDialog();

			await user.type(
				await screen.findByPlaceholderText(/Sala de Estar, Cozinha/i),
				"Rascunho",
			);
			await user.click(screen.getByRole("button", { name: "Cancelar" }));

			await screen.findByRole("alertdialog");
			await user.click(screen.getByRole("button", { name: "Descartar" }));

			await waitFor(() => {
				expect(screen.queryByText("Novo Ambiente")).not.toBeInTheDocument();
			});
		});

		it("RoomFormDialog_CancelWithUnsavedChangesAndDismissConfirm_KeepsDialogOpen", async () => {
			const user = userEvent.setup();
			renderWithProviders(<RoomFormDialog />);
			useRoomsUIStore.getState().openCreateDialog();

			await user.type(
				await screen.findByPlaceholderText(/Sala de Estar, Cozinha/i),
				"Rascunho",
			);
			await user.click(screen.getByRole("button", { name: "Cancelar" }));

			const alertDialog = await screen.findByRole("alertdialog");
			await user.click(
				within(alertDialog).getByRole("button", { name: "Cancelar" }),
			);

			await waitFor(() => {
				expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
			});
			expect(screen.getByText("Novo Ambiente")).toBeInTheDocument();
		});
	});
});
