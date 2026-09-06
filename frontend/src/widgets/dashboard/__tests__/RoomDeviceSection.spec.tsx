import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardPreviewStore } from "@/features/dashboard/store/dashboard-preview.store";
import { DeviceTypeEnum } from "@/features/devices/types/devices.types";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomDeviceSection } from "../RoomDeviceSection";

const lamp = createDeviceMock({
	id: "device-lamp",
	name: "Lâmpada da Sala",
	type: DeviceTypeEnum.Light,
});
const plug = createDeviceMock({
	id: "device-plug",
	name: "Tomada da Cozinha",
	type: DeviceTypeEnum.Switch,
});
const tv = createDeviceMock({
	id: "device-tv",
	name: "TV da Sala",
	type: DeviceTypeEnum.Television,
});

function renderSection(devices = [lamp, plug, tv], props = {}) {
	return renderWithProviders(
		<MemoryRouter>
			<RoomDeviceSection
				title="Sala de Estar"
				roomId="room-01"
				devices={devices}
				{...props}
			/>
		</MemoryRouter>,
	);
}

describe("RoomDeviceSection Integration Tests", () => {
	beforeEach(() => {
		// Zustand persist grava no localStorage — sem reset, um teste vaza
		// override/expand state pro próximo dentro do mesmo arquivo.
		useDashboardPreviewStore.setState({
			overridesByRoom: {},
			expandedByRoom: {},
		});
		localStorage.clear();
	});

	it("RoomDeviceSection_Rendered_ShouldShowTitleAndDeviceCount", () => {
		// Act
		renderSection();

		// Assert
		expect(screen.getByText("Sala de Estar")).toBeInTheDocument();
		expect(screen.getByText("(3)")).toBeInTheDocument();
	});

	it("RoomDeviceSection_NoEnergyUsageProp_ShouldNotRenderConsumptionLabel", () => {
		// Act
		renderSection();

		// Assert
		expect(screen.queryByText(/consumo:/i)).not.toBeInTheDocument();
	});

	it("RoomDeviceSection_EnergyUsageProvided_ShouldRenderFormattedConsumption", () => {
		// Act
		renderSection([lamp, plug, tv], { energyUsageKwh: 0.13 });

		// Assert
		expect(screen.getByText(/consumo:/i)).toBeInTheDocument();
		expect(screen.getByText("130 Wh")).toBeInTheDocument();
	});

	it("RoomDeviceSection_EnergyUsageEstimated_ShouldPrefixValueWithTilde", () => {
		// Act
		renderSection([lamp, plug, tv], {
			energyUsageKwh: 0.13,
			energyUsageIsEstimated: true,
		});

		// Assert
		expect(screen.getByText("~130 Wh")).toBeInTheDocument();
	});

	it("RoomDeviceSection_WideDeviceFirst_ShouldPreviewOnlyThatDeviceAndOfferViewAll", () => {
		// Arrange — TV (wide) é o primeiro dispositivo: sozinha ocupa a linha,
		// então lamp/plug ficam de fora do preview.
		renderSection([tv, lamp, plug]);

		// Assert
		expect(screen.getByText("TV da Sala")).toBeInTheDocument();
		expect(screen.queryByText("Lâmpada da Sala")).not.toBeInTheDocument();
		expect(screen.queryByText("Tomada da Cozinha")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ver todos os dispositivos/i }),
		).toBeInTheDocument();
	});

	it("RoomDeviceSection_TwoNormalDevicesFirst_ShouldPreviewBothWithoutViewAll", () => {
		// Arrange — lamp + plug (1 unidade cada) enchem a linha de 2 unidades;
		// só sobra a TV de fora, então "ver todos" deve aparecer.
		renderSection([lamp, plug, tv]);

		// Assert
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
		expect(screen.getByText("Tomada da Cozinha")).toBeInTheDocument();
		expect(screen.queryByText("TV da Sala")).not.toBeInTheDocument();
	});

	it("RoomDeviceSection_AllDevicesFitInOneRow_ShouldNotShowViewAllButton", () => {
		// Act — só 2 dispositivos normais, cabem tudo no preview
		renderSection([lamp, plug]);

		// Assert
		expect(
			screen.queryByRole("button", { name: /ver todos os dispositivos/i }),
		).not.toBeInTheDocument();
	});

	it("RoomDeviceSection_ClickChevron_ShouldCollapseAndHideDevices", async () => {
		// Arrange
		const user = userEvent.setup();
		renderSection([lamp, plug]);
		expect(screen.getByText("Lâmpada da Sala")).toBeVisible();

		// Act
		await user.click(
			screen.getByRole("button", { name: /expandir\/recolher/i }),
		);

		// Assert
		expect(screen.queryByText("Lâmpada da Sala")).not.toBeInTheDocument();
	});

	it("RoomDeviceSection_ClickPencil_ShouldOpenEditPreviewModal", async () => {
		// Arrange
		const user = userEvent.setup();
		renderSection([lamp, plug]);

		// Act
		await user.click(
			screen.getByRole("button", {
				name: /escolher dispositivos exibidos/i,
			}),
		);

		// Assert
		expect(
			screen.getByRole("dialog", { name: /escolher dispositivos exibidos/i }),
		).toBeInTheDocument();
	});

	it("RoomDeviceSection_UnassignedRoom_ShouldRenderWithoutRoomId", () => {
		// Act — bucket "Sem Ambiente" não tem roomId (undefined)
		renderWithProviders(
			<MemoryRouter>
				<RoomDeviceSection title="Sem Ambiente" devices={[lamp]} />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText("Sem Ambiente")).toBeInTheDocument();
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
	});

	it("RoomDeviceSection_NoDevices_ShouldRenderEmptyRowWithoutCrashing", () => {
		// Act & Assert
		expect(() => renderSection([])).not.toThrow();
		expect(screen.getByText("(0)")).toBeInTheDocument();
	});
});
