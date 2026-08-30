import { create } from "zustand";
import type {
	CreateDevicePayload,
	Device,
	DiscoveredDevice,
	StatusFilterType,
} from "../types/devices.types";

export type ViewModeType = "grid" | "list";
export type DiscoveryStep = "scan" | "configure" | "done";

function discoveredDeviceKey(device: DiscoveredDevice): string {
	return (
		device.externalId ||
		device.temporaryId ||
		`${device.ipAddress}-${device.macAddress}`
	);
}

/**
 * Interface defining the temporary UI state and actions for the Devices feature.
 */
interface DevicesUIState {
	// Search and Filtering State
	query: string;
	activeTab: string;
	statusFilter: StatusFilterType;
	selectedRoomId: string | null;
	onlyOn: boolean;
	viewMode: ViewModeType;
	page: number;

	/** Item selecionado no painel master-detail (não confundir com o filtro `selectedRoomId`). */
	selectedDeviceId: string | null;

	setQuery: (query: string) => void;
	setActiveTab: (tab: string) => void;
	setStatusFilter: (filter: StatusFilterType) => void;
	setSelectedRoomId: (roomId: string | null) => void;
	toggleOnlyOn: () => void;
	setViewMode: (mode: ViewModeType) => void;
	setPage: (page: number) => void;
	setSelectedDeviceId: (deviceId: string | null) => void;
	resetFilters: () => void;

	// Edit Modal State
	editingDevice: Device | null;
	openEditModal: (device: Device) => void;
	closeEditModal: () => void;

	// Discovery Modal State
	isDiscoveryModalOpen: boolean;
	discoveryStep: DiscoveryStep;
	isScanning: boolean;
	discoveredDevices: DiscoveredDevice[];
	selectedDiscoveredDevice: DiscoveredDevice | null;
	/** Dados validados na Etapa 2, aguardando confirmação de salvamento na Etapa 3. */
	pendingDevicePayload: CreateDevicePayload | null;
	lastCreatedDeviceName: string | null;
	/** Incrementado para forçar o useDeviceDiscovery a re-escanear sem fechar o modal. */
	scanTrigger: number;

	openDiscoveryModal: () => void;
	closeDiscoveryModal: () => void;
	setDiscoveryStep: (step: DiscoveryStep) => void;
	setIsScanning: (isScanning: boolean) => void;
	addDiscoveredDevice: (device: DiscoveredDevice) => void;
	selectDiscoveredDevice: (device: DiscoveredDevice) => void;
	setPendingDevicePayload: (payload: CreateDevicePayload) => void;
	resetDiscovery: () => void;
	triggerRescan: () => void;
	setLastCreatedDeviceName: (name: string | null) => void;
}

/**
 * Zustand store managing ephemeral client-side UI states
 * (modals visibility, active category/status filters, selected device for edition).
 */
export const useDevicesUIStore = create<DevicesUIState>((set) => ({
	// Default Values
	query: "",
	activeTab: "Todos",
	statusFilter: null,
	selectedRoomId: null,
	onlyOn: false,
	viewMode: "grid",
	page: 1,
	selectedDeviceId: null,
	editingDevice: null,
	isDiscoveryModalOpen: false,
	discoveryStep: "scan",
	isScanning: false,
	discoveredDevices: [],
	selectedDiscoveredDevice: null,
	pendingDevicePayload: null,
	lastCreatedDeviceName: null,
	scanTrigger: 0,

	// Filter Actions (todas resetam a página para 1 — a página atual pode não
	// existir mais no novo conjunto filtrado)
	setQuery: (query) => set({ query, page: 1 }),
	setActiveTab: (activeTab) => set({ activeTab, page: 1 }),
	setStatusFilter: (filter) =>
		set((state) => ({
			statusFilter: state.statusFilter === filter ? null : filter,
			page: 1,
		})),
	setSelectedRoomId: (roomId) =>
		set((state) => ({
			selectedRoomId: state.selectedRoomId === roomId ? null : roomId,
			page: 1,
		})),
	toggleOnlyOn: () => set((state) => ({ onlyOn: !state.onlyOn, page: 1 })),
	setViewMode: (viewMode) => set({ viewMode }),
	setPage: (page) => set({ page }),
	setSelectedDeviceId: (selectedDeviceId) => set({ selectedDeviceId }),
	resetFilters: () =>
		set({
			query: "",
			activeTab: "Todos",
			statusFilter: null,
			selectedRoomId: null,
			onlyOn: false,
			page: 1,
		}),

	// Edit Modal Actions
	openEditModal: (device) => set({ editingDevice: device }),
	closeEditModal: () => set({ editingDevice: null }),

	// Discovery Modal Actions
	openDiscoveryModal: () => set({ isDiscoveryModalOpen: true }),
	closeDiscoveryModal: () =>
		set({
			isDiscoveryModalOpen: false,
			discoveryStep: "scan",
			isScanning: false,
			discoveredDevices: [],
			selectedDiscoveredDevice: null,
			pendingDevicePayload: null,
			lastCreatedDeviceName: null,
		}),
	setDiscoveryStep: (discoveryStep) => set({ discoveryStep }),
	setIsScanning: (isScanning) => set({ isScanning }),
	addDiscoveredDevice: (device) =>
		set((state) => {
			const key = discoveredDeviceKey(device);
			const alreadyKnown = state.discoveredDevices.some(
				(d) => discoveredDeviceKey(d) === key,
			);
			if (alreadyKnown) return state;
			return { discoveredDevices: [...state.discoveredDevices, device] };
		}),
	selectDiscoveredDevice: (device) =>
		set({ selectedDiscoveredDevice: device, discoveryStep: "configure" }),
	setPendingDevicePayload: (payload) =>
		set({ pendingDevicePayload: payload, discoveryStep: "done" }),
	resetDiscovery: () =>
		set((state) => ({
			discoveryStep: "scan",
			discoveredDevices: [],
			selectedDiscoveredDevice: null,
			pendingDevicePayload: null,
			lastCreatedDeviceName: null,
			scanTrigger: state.scanTrigger + 1,
		})),
	triggerRescan: () => set((state) => ({ scanTrigger: state.scanTrigger + 1 })),
	setLastCreatedDeviceName: (lastCreatedDeviceName) =>
		set({ lastCreatedDeviceName }),
}));
