import { HttpResponse, http } from "msw";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createPickerDeviceMock } from "@/testing/mocks/device-groups.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DeviceGroupMultiSelect } from "../DeviceGroupMultiSelect";

function mockPickerDevices(devices: unknown[]) {
	server.use(http.get("*/api/devices", () => HttpResponse.json(devices)));
}

/** Controlled harness mirroring how DeviceGroupFormDialog actually drives the component. */
function ControlledMultiSelect({
	onChange,
	initialSelectedIds = [],
}: {
	onChange?: (ids: string[]) => void;
	initialSelectedIds?: string[];
}) {
	const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

	return (
		<DeviceGroupMultiSelect
			id="group-devices"
			label="Dispositivos do Grupo"
			selectedIds={selectedIds}
			onChange={(ids) => {
				setSelectedIds(ids);
				onChange?.(ids);
			}}
		/>
	);
}

describe("DeviceGroupMultiSelect Integration Tests", () => {
	it("DeviceGroupMultiSelect_DevicesAvailable_ShouldRenderListFromApi", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
			createPickerDeviceMock({ id: "dev-2", name: "Sensor Cozinha" }),
		]);

		// Act
		renderWithProviders(<ControlledMultiSelect />);

		// Assert
		expect(await screen.findByText("Lâmpada Sala")).toBeInTheDocument();
		expect(screen.getByText("Sensor Cozinha")).toBeInTheDocument();
	});

	it("DeviceGroupMultiSelect_ClickUnselectedDevice_ShouldCallOnChangeWithDeviceAdded", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
		]);
		const onChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(<ControlledMultiSelect onChange={onChange} />);

		// Act
		const checkbox = await screen.findByRole("checkbox", {
			name: /Lâmpada Sala/,
		});
		await user.click(checkbox);

		// Assert
		expect(onChange).toHaveBeenCalledWith(["dev-1"]);
		expect(checkbox).toBeChecked();
	});

	it("DeviceGroupMultiSelect_ClickSelectedDevice_ShouldCallOnChangeWithDeviceRemoved", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
			createPickerDeviceMock({ id: "dev-2", name: "Sensor Cozinha" }),
		]);
		const onChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<ControlledMultiSelect
				onChange={onChange}
				initialSelectedIds={["dev-1", "dev-2"]}
			/>,
		);

		// Act
		const checkbox = await screen.findByRole("checkbox", {
			name: /Lâmpada Sala/,
		});
		expect(checkbox).toBeChecked();
		await user.click(checkbox);

		// Assert
		expect(onChange).toHaveBeenCalledWith(["dev-2"]);
	});

	it("DeviceGroupMultiSelect_TypeSearchTerm_ShouldFilterDisplayedDevicesByNameOrBrand", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({
				id: "dev-1",
				name: "Lâmpada Sala",
				brand: "Philips Hue",
			}),
			createPickerDeviceMock({
				id: "dev-2",
				name: "Sensor Cozinha",
				brand: "Aqara",
			}),
		]);
		const user = userEvent.setup();
		renderWithProviders(<ControlledMultiSelect />);
		await screen.findByText("Lâmpada Sala");

		// Act — filtra por marca, não só por nome
		await user.type(
			screen.getByPlaceholderText("Buscar dispositivo por nome ou marca..."),
			"aqara",
		);

		// Assert
		expect(screen.getByText("Sensor Cozinha")).toBeInTheDocument();
		expect(screen.queryByText("Lâmpada Sala")).not.toBeInTheDocument();
	});

	it("DeviceGroupMultiSelect_SearchTermMatchesNothing_ShouldRenderEmptySearchMessage", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
		]);
		const user = userEvent.setup();
		renderWithProviders(<ControlledMultiSelect />);
		await screen.findByText("Lâmpada Sala");

		// Act
		await user.type(
			screen.getByPlaceholderText("Buscar dispositivo por nome ou marca..."),
			"nada-encontrado-xyz",
		);

		// Assert
		expect(
			screen.getByText("Nenhum dispositivo encontrado."),
		).toBeInTheDocument();
		expect(screen.queryByText("Lâmpada Sala")).not.toBeInTheDocument();
	});

	it("DeviceGroupMultiSelect_NoDevicesAvailable_ShouldRenderEmptyStateWithoutCrashing", async () => {
		// Arrange
		mockPickerDevices([]);

		// Act
		renderWithProviders(<ControlledMultiSelect />);

		// Assert
		expect(
			await screen.findByText("Nenhum dispositivo encontrado."),
		).toBeInTheDocument();
	});

	it("DeviceGroupMultiSelect_ApiFailsToLoadDevices_ShouldRenderErrorMessage", async () => {
		// Arrange
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);

		// Act
		renderWithProviders(<ControlledMultiSelect />);

		// Assert
		expect(
			await screen.findByText(
				"Erro ao carregar os dispositivos disponíveis.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
	});
});
