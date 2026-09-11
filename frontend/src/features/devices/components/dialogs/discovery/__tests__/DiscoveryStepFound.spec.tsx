import { beforeEach, describe, expect, it } from "vitest";
import { useDevicesUIStore } from "@/features/devices/store/devices-ui.store";
import {
	DeviceTypeEnum,
	type DiscoveredDevice,
	IntegrationTypeEnum,
} from "@/features/devices/types/devices.types";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { DiscoveryStepFound } from "../DiscoveryStepFound";

const mockDiscoveredDevice: DiscoveredDevice = {
	temporaryId: "temp-1",
	name: "Lâmpada Inteligente",
	brand: "Philips",
	externalId: "ext-1",
	type: DeviceTypeEnum.Light,
	integrationType: IntegrationTypeEnum.TuyaLocal,
	ipAddress: "192.168.1.50",
	macAddress: null,
	signalStrength: -45,
	additionalProperties: null,
	upnpServices: null,
};

describe("DiscoveryStepFound Integration Tests", () => {
	beforeEach(() => {
		useDevicesUIStore.setState({
			discoveredDevices: [],
			isScanning: false,
		});
	});

	it("DiscoveryStepFound_WhenScanningWithNoDevices_RendersSkeletonsWithRoleStatusAndAriaBusy", () => {
		useDevicesUIStore.setState({
			discoveredDevices: [],
			isScanning: true,
		});

		renderWithProviders(<DiscoveryStepFound />);

		const statusContainer = screen.getByRole("status");
		expect(statusContainer).toBeInTheDocument();
		expect(statusContainer).toHaveAttribute("aria-busy", "true");
	});

	it("DiscoveryStepFound_WhenDevicesFound_RendersDeviceCardAndReplacesEmptyState", () => {
		useDevicesUIStore.setState({
			discoveredDevices: [mockDiscoveredDevice],
			isScanning: false,
		});

		renderWithProviders(<DiscoveryStepFound />);

		expect(screen.getByText("Lâmpada Inteligente")).toBeInTheDocument();
		expect(screen.getByText("Philips")).toBeInTheDocument();
		expect(screen.getByText(/Sinal: -45/i)).toBeInTheDocument();
	});
});
