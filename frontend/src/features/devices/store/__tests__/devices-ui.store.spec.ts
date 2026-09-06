import { beforeEach, describe, expect, it } from "vitest";
import type { Device, DiscoveredDevice } from "../../types/devices.types";
import { useDevicesUIStore } from "../devices-ui.store";

describe("devices-ui.store Unit Tests", () => {
	beforeEach(() => {
		useDevicesUIStore.setState({
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
		});
	});

	it("filterActions_ShouldUpdateFiltersAndResetPageToOne", () => {
		const store = useDevicesUIStore.getState();

		// Set page to 3 first
		store.setPage(3);
		expect(useDevicesUIStore.getState().page).toBe(3);

		// setQuery
		store.setQuery("luz");
		expect(useDevicesUIStore.getState().query).toBe("luz");
		expect(useDevicesUIStore.getState().page).toBe(1);

		// setActiveTab
		store.setPage(2);
		store.setActiveTab("Lâmpadas");
		expect(useDevicesUIStore.getState().activeTab).toBe("Lâmpadas");
		expect(useDevicesUIStore.getState().page).toBe(1);

		// setStatusFilter (toggle on/off)
		store.setPage(2);
		store.setStatusFilter("online");
		expect(useDevicesUIStore.getState().statusFilter).toBe("online");
		expect(useDevicesUIStore.getState().page).toBe(1);

		store.setStatusFilter("online"); // toggle off
		expect(useDevicesUIStore.getState().statusFilter).toBeNull();

		// setSelectedRoomId (toggle on/off)
		store.setSelectedRoomId("room-1");
		expect(useDevicesUIStore.getState().selectedRoomId).toBe("room-1");

		store.setSelectedRoomId("room-1"); // toggle off
		expect(useDevicesUIStore.getState().selectedRoomId).toBeNull();

		// toggleOnlyOn
		store.toggleOnlyOn();
		expect(useDevicesUIStore.getState().onlyOn).toBe(true);

		store.toggleOnlyOn();
		expect(useDevicesUIStore.getState().onlyOn).toBe(false);

		// setViewMode & setSelectedDeviceId
		store.setViewMode("list");
		expect(useDevicesUIStore.getState().viewMode).toBe("list");

		store.setSelectedDeviceId("dev-1");
		expect(useDevicesUIStore.getState().selectedDeviceId).toBe("dev-1");

		// resetFilters
		store.setQuery("test");
		store.setActiveTab("Salas");
		store.setStatusFilter("offline");
		store.setSelectedRoomId("room-99");
		store.toggleOnlyOn();
		store.setPage(5);

		store.resetFilters();
		const resetState = useDevicesUIStore.getState();
		expect(resetState.query).toBe("");
		expect(resetState.activeTab).toBe("Todos");
		expect(resetState.statusFilter).toBeNull();
		expect(resetState.selectedRoomId).toBeNull();
		expect(resetState.onlyOn).toBe(false);
		expect(resetState.page).toBe(1);
	});

	it("editModalActions_ShouldOpenAndCloseModal", () => {
		const store = useDevicesUIStore.getState();
		const mockDevice = { id: "d-1", name: "Device 1" } as Device;

		store.openEditModal(mockDevice);
		expect(useDevicesUIStore.getState().editingDevice).toBe(mockDevice);

		store.closeEditModal();
		expect(useDevicesUIStore.getState().editingDevice).toBeNull();
	});

	it("discoveryModalActions_ShouldManageDiscoveryLifecycle", () => {
		const store = useDevicesUIStore.getState();
		const discovered1: DiscoveredDevice = {
			externalId: "ext-1",
			ipAddress: "192.168.1.50",
			macAddress: "AA:BB:CC:DD:EE:01",
			name: "New Bulb",
			integrationType: 1,
			model: "Model-X",
		};

		store.openDiscoveryModal();
		expect(useDevicesUIStore.getState().isDiscoveryModalOpen).toBe(true);

		store.setIsScanning(true);
		expect(useDevicesUIStore.getState().isScanning).toBe(true);

		// Add device
		store.addDiscoveredDevice(discovered1);
		expect(useDevicesUIStore.getState().discoveredDevices).toHaveLength(1);

		// Deduplication check
		store.addDiscoveredDevice(discovered1);
		expect(useDevicesUIStore.getState().discoveredDevices).toHaveLength(1);

		// Deduplication by fallback key
		const discovered2: DiscoveredDevice = {
			temporaryId: "temp-99",
			ipAddress: "192.168.1.51",
			macAddress: "AA:BB:CC:DD:EE:02",
			name: "Sensor",
			integrationType: 2,
		};
		store.addDiscoveredDevice(discovered2);
		expect(useDevicesUIStore.getState().discoveredDevices).toHaveLength(2);

		store.addDiscoveredDevice({ ...discovered2 });
		expect(useDevicesUIStore.getState().discoveredDevices).toHaveLength(2);

		// Select discovered device
		store.selectDiscoveredDevice(discovered1);
		expect(useDevicesUIStore.getState().selectedDiscoveredDevice).toBe(
			discovered1,
		);
		expect(useDevicesUIStore.getState().discoveryStep).toBe("configure");

		// Set pending payload
		const payload = {
			name: "Bulb Configured",
			room: "Sala",
			integrationType: 1,
			type: 1,
		};
		store.setPendingDevicePayload(payload);
		expect(useDevicesUIStore.getState().pendingDevicePayload).toBe(payload);
		expect(useDevicesUIStore.getState().discoveryStep).toBe("done");

		// Trigger rescan & set last created device name
		expect(useDevicesUIStore.getState().scanTrigger).toBe(0);
		store.triggerRescan();
		expect(useDevicesUIStore.getState().scanTrigger).toBe(1);

		store.setLastCreatedDeviceName("Lâmpada Criada");
		expect(useDevicesUIStore.getState().lastCreatedDeviceName).toBe(
			"Lâmpada Criada",
		);

		// Reset discovery
		store.resetDiscovery();
		const stateAfterReset = useDevicesUIStore.getState();
		expect(stateAfterReset.discoveryStep).toBe("scan");
		expect(stateAfterReset.discoveredDevices).toEqual([]);
		expect(stateAfterReset.selectedDiscoveredDevice).toBeNull();
		expect(stateAfterReset.pendingDevicePayload).toBeNull();
		expect(stateAfterReset.scanTrigger).toBe(2);

		// Close modal
		store.closeDiscoveryModal();
		expect(useDevicesUIStore.getState().isDiscoveryModalOpen).toBe(false);
	});
});
