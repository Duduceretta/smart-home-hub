import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { createRoomMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { useRoomsUIStore } from "../../../store/rooms-ui.store";
import { DeleteRoomAlertDialog } from "../DeleteRoomAlertDialog";

beforeEach(() => {
	useRoomsUIStore.getState().closeDeleteDialog();
});

describe("DeleteRoomAlertDialog Integration Tests", () => {
	it("DeleteRoomAlertDialog_NoRoomTargeted_DoesNotRenderDialog", () => {
		renderWithProviders(<DeleteRoomAlertDialog />);

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("DeleteRoomAlertDialog_RoomTargeted_RendersConfirmationWithRoomName", async () => {
		renderWithProviders(<DeleteRoomAlertDialog />);

		useRoomsUIStore
			.getState()
			.openDeleteDialog(createRoomMock({ name: "Varanda" }));

		expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
		expect(
			screen.getByText(/Tem certeza que deseja excluir o ambiente "Varanda"/i),
		).toBeInTheDocument();
	});

	it("DeleteRoomAlertDialog_ClickCancel_ClosesDialogWithoutCallingApi", async () => {
		let deleteCalled = false;
		server.use(
			http.delete("*/api/rooms/:id", () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<DeleteRoomAlertDialog />);
		useRoomsUIStore.getState().openDeleteDialog(createRoomMock());

		await screen.findByRole("alertdialog");
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(deleteCalled).toBe(false);
	});

	it("DeleteRoomAlertDialog_ConfirmDelete_CallsDeleteApiAndClosesDialog", async () => {
		const targetRoom = createRoomMock({ id: "room-to-delete" });
		let deletedId: string | null = null;
		server.use(
			http.delete("*/api/rooms/:id", ({ params }) => {
				deletedId = params.id as string;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<DeleteRoomAlertDialog />);
		useRoomsUIStore.getState().openDeleteDialog(targetRoom);

		await screen.findByRole("alertdialog");
		await user.click(screen.getByRole("button", { name: "Excluir" }));

		await waitFor(() => {
			expect(deletedId).toBe("room-to-delete");
		});
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});
});
