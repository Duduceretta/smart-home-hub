import { create } from "zustand";
import type { Room, RoomsViewMode } from "../types/rooms.types";

/**
 * Interface defining the temporary UI state and actions for the Rooms feature.
 */
interface RoomsUIState {
	// Split-view Selection State — mesmo racional de `selectedRoomId`/`viewMode`
	// em devices-ui.store.ts: seleção/modo de visualização é estado de UI
	// efêmero, não pertence a um useState local do componente de página.
	selectedRoomId: string | null;
	viewMode: RoomsViewMode;
	setSelectedRoomId: (roomId: string | null) => void;
	setViewMode: (mode: RoomsViewMode) => void;

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
	selectedRoomId: null,
	viewMode: "cards",
	isCreateDialogOpen: false,
	editingRoom: null,
	editDialogFocusDevices: false,
	deletingRoom: null,

	// Split-view Selection Actions
	setSelectedRoomId: (selectedRoomId) => set({ selectedRoomId }),
	setViewMode: (viewMode) => set({ viewMode }),

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
