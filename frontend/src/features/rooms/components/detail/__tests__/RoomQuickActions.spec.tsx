import { HttpResponse, http } from "msw";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";
import { createRoomPickerDeviceMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomQuickActions } from "../RoomQuickActions";

function renderWithToaster(
	devices: ReturnType<typeof createRoomPickerDeviceMock>[],
) {
	return renderWithProviders(
		<>
			<RoomQuickActions roomId="room-01" devices={devices} />
			<Toaster />
		</>,
	);
}

describe("RoomQuickActions Integration Tests", () => {
	it("RoomQuickActions_NoEligibleDeviceOn_ShouldDisableTurnOnAllButton", () => {
		// Arrange — atuador (tipo 1) já ligado: nada elegível pra "Ligar Tudo"
		const devices = [
			createRoomPickerDeviceMock({ type: 1, isOnline: true, isOn: true }),
		];

		// Act
		renderWithProviders(
			<RoomQuickActions roomId="room-01" devices={devices} />,
		);

		// Assert
		expect(screen.getByRole("button", { name: /Ligar Tudo/ })).toBeDisabled();
		expect(screen.getByRole("button", { name: /Desligar Tudo/ })).toBeEnabled();
	});

	it("RoomQuickActions_OfflineDevice_ShouldNotCountAsEligible", () => {
		// Arrange — atuador desligado mas offline não é elegível pra nenhum botão
		const devices = [
			createRoomPickerDeviceMock({ type: 1, isOnline: false, isOn: false }),
		];

		// Act
		renderWithProviders(
			<RoomQuickActions roomId="room-01" devices={devices} />,
		);

		// Assert
		expect(screen.getByRole("button", { name: /Ligar Tudo/ })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /Desligar Tudo/ }),
		).toBeDisabled();
	});

	it("RoomQuickActions_ClickTurnOnAll_ShouldShowSuccessToastOnFullSuccess", async () => {
		// Arrange
		server.use(
			http.post("*/api/rooms/:id/devices/turn-on", () =>
				HttpResponse.json({ succeededCount: 2, failedCount: 0, totalCount: 2 }),
			),
		);
		const devices = [
			createRoomPickerDeviceMock({
				id: "d1",
				type: 1,
				isOnline: true,
				isOn: false,
			}),
			createRoomPickerDeviceMock({
				id: "d2",
				type: 2,
				isOnline: true,
				isOn: false,
			}),
		];
		const user = userEvent.setup();

		// Act
		renderWithToaster(devices);
		await user.click(screen.getByRole("button", { name: /Ligar Tudo/ }));

		// Assert
		expect(
			await screen.findByText("2 dispositivos ligados."),
		).toBeInTheDocument();
	});

	it("RoomQuickActions_ClickTurnOffAll_ShouldShowPartialFailureToast", async () => {
		// Arrange
		server.use(
			http.post("*/api/rooms/:id/devices/turn-off", () =>
				HttpResponse.json({ succeededCount: 1, failedCount: 1, totalCount: 2 }),
			),
		);
		const devices = [
			createRoomPickerDeviceMock({
				id: "d1",
				type: 1,
				isOnline: true,
				isOn: true,
			}),
			createRoomPickerDeviceMock({
				id: "d2",
				type: 2,
				isOnline: true,
				isOn: true,
			}),
		];
		const user = userEvent.setup();

		// Act
		renderWithToaster(devices);
		await user.click(screen.getByRole("button", { name: /Desligar Tudo/ }));

		// Assert
		expect(
			await screen.findByText("1 de 2 dispositivos desligados — 1 falharam."),
		).toBeInTheDocument();
	});
});
