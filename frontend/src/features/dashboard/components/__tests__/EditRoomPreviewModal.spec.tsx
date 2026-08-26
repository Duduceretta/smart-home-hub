import { describe, expect, it, vi } from "vitest";
import { DeviceTypeEnum } from "@/features/devices/types/devices.types";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { EditRoomPreviewModal } from "../EditRoomPreviewModal";

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

describe("EditRoomPreviewModal Integration Tests", () => {
	it("EditRoomPreviewModal_Closed_ShouldNotRenderDialogContent", () => {
		// Act
		renderWithProviders(
			<EditRoomPreviewModal
				isOpen={false}
				onClose={vi.fn()}
				devices={[lamp, plug, tv]}
				selectedIds={[lamp.id]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Assert
		expect(screen.queryByText("Lâmpada da Sala")).not.toBeInTheDocument();
	});

	it("EditRoomPreviewModal_Open_ShouldListAllDevicesWithSelectedOnesChecked", () => {
		// Act
		renderWithProviders(
			<EditRoomPreviewModal
				isOpen
				onClose={vi.fn()}
				devices={[lamp, plug, tv]}
				selectedIds={[lamp.id]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Assert
		expect(
			screen.getByRole("checkbox", { name: /Lâmpada da Sala/ }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: /Tomada da Cozinha/ }),
		).not.toBeChecked();
	});

	it("EditRoomPreviewModal_SelectingTwoNormalDevices_ShouldFillRowCapacityAndDisableTheRest", async () => {
		// Arrange — Light/Switch ocupam 1 unidade, capacidade da linha é 2
		const user = userEvent.setup();
		renderWithProviders(
			<EditRoomPreviewModal
				isOpen
				onClose={vi.fn()}
				devices={[lamp, plug, tv]}
				selectedIds={[]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Act — seleciona os dois dispositivos normais (1 unidade cada = 2 no total)
		await user.click(screen.getByRole("checkbox", { name: /Lâmpada da Sala/ }));
		await user.click(
			screen.getByRole("checkbox", { name: /Tomada da Cozinha/ }),
		);

		// Assert — TV (2 unidades) estouraria a capacidade, fica desabilitada
		expect(screen.getByRole("checkbox", { name: /TV da Sala/ })).toBeDisabled();
	});

	it("EditRoomPreviewModal_SelectingWideDevice_ShouldDisableEveryOtherDevice", async () => {
		// Arrange — TV (Television) ocupa as 2 unidades da linha sozinha
		const user = userEvent.setup();
		renderWithProviders(
			<EditRoomPreviewModal
				isOpen
				onClose={vi.fn()}
				devices={[lamp, plug, tv]}
				selectedIds={[]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Act
		await user.click(screen.getByRole("checkbox", { name: /TV da Sala/ }));

		// Assert
		expect(
			screen.getByRole("checkbox", { name: /Lâmpada da Sala/ }),
		).toBeDisabled();
		expect(
			screen.getByRole("checkbox", { name: /Tomada da Cozinha/ }),
		).toBeDisabled();
	});

	it("EditRoomPreviewModal_ClickSave_ShouldCallOnSaveWithDraftAndClose", async () => {
		// Arrange
		const onSave = vi.fn();
		const onClose = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<EditRoomPreviewModal
				isOpen
				onClose={onClose}
				devices={[lamp, plug, tv]}
				selectedIds={[lamp.id]}
				onSave={onSave}
				onReset={vi.fn()}
			/>,
		);

		// Act
		await user.click(
			screen.getByRole("checkbox", { name: /Tomada da Cozinha/ }),
		);
		await user.click(screen.getByRole("button", { name: /salvar/i }));

		// Assert
		expect(onSave).toHaveBeenCalledWith([lamp.id, plug.id]);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("EditRoomPreviewModal_ClickResetToAuto_ShouldCallOnResetAndClose", async () => {
		// Arrange
		const onReset = vi.fn();
		const onClose = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<EditRoomPreviewModal
				isOpen
				onClose={onClose}
				devices={[lamp, plug, tv]}
				selectedIds={[lamp.id]}
				onSave={vi.fn()}
				onReset={onReset}
			/>,
		);

		// Act
		await user.click(screen.getByRole("button", { name: /usar automático/i }));

		// Assert
		expect(onReset).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("EditRoomPreviewModal_SelectedIdsChangeWhileOpen_ShouldNotOverwriteInProgressEdit", () => {
		// Arrange — regressão: um refetch em segundo plano recalcula selectedIds
		// com nova referência de array; o modal não pode perder a edição do
		// usuário em andamento por causa disso.
		const { rerender } = renderWithProviders(
			<EditRoomPreviewModal
				isOpen
				onClose={vi.fn()}
				devices={[lamp, plug, tv]}
				selectedIds={[lamp.id]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Act — desmarca a lâmpada, depois o pai re-renderiza com um NOVO array
		// (mesmo conteúdo, referência diferente) simulando um refetch
		const checkbox = screen.getByRole("checkbox", { name: /Lâmpada da Sala/ });
		checkbox.click();
		rerender(
			<EditRoomPreviewModal
				isOpen
				onClose={vi.fn()}
				devices={[lamp, plug, tv]}
				selectedIds={[...[lamp.id]]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Assert — a desmarcação do usuário não deve ser revertida
		expect(checkbox).not.toBeChecked();
	});
});
