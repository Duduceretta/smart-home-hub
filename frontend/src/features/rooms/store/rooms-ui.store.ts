import { create } from "zustand";
import type { Room } from "../types/rooms.types";

/**
 * Interface defining the temporary UI state and actions for the Rooms feature.
 */
interface RoomsUIState {
	// Search and Filtering State
	query: string;
	setQuery: (query: string) => void;
	resetFilters: () => void;

	// Create/Edit Dialog State — o `RoomFormDialog` (único, criação+edição) lê os três campos
	// abaixo pra decidir modo (`editingRoom` presente = "edit") e se deve
	// abrir com o scroll já posicionado na seção de dispositivos (usado pelo
	// botão "+ Adicionar Dispositivo a este Ambiente" do `RoomDetailPanel`).
	isCreateDialogOpen: boolean;
	editingRoom: Room | null;
	editDialogFocusDevices: boolean;
	openCreateDialog: () => void;
	openEditDialog: (room: Room, options?: { focusDevices?: boolean }) => void;
	closeFormDialog: () => void;

	// Delete Confirmation State
	deletingRoom: Room | null;
	openDeleteDialog: (room: Room) => void;
	closeDeleteDialog: () => void;
}

/**
 * Zustand store managing efemeral client-side UI states
 * (modals visibility, active filters, selected room for edition).
 */
export const useRoomsUIStore = create<RoomsUIState>((set) => ({
	// Default Values
	query: "",
	isCreateDialogOpen: false,
	editingRoom: null,
	editDialogFocusDevices: false,
	deletingRoom: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	resetFilters: () => set({ query: "" }),

	// Create/Edit Dialog Actions
	openCreateDialog: () =>
		set({
			isCreateDialogOpen: true,
			editingRoom: null,
			editDialogFocusDevices: false,
		}),
	openEditDialog: (room, options) =>
		set({
			editingRoom: room,
			isCreateDialogOpen: false,
			editDialogFocusDevices: options?.focusDevices ?? false,
		}),
	closeFormDialog: () =>
		set({
			isCreateDialogOpen: false,
			editingRoom: null,
			editDialogFocusDevices: false,
		}),

	// Delete Confirmation Actions
	openDeleteDialog: (room) => set({ deletingRoom: room }),
	closeDeleteDialog: () => set({ deletingRoom: null }),
}));
