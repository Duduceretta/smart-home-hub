import { describe, expect, it, vi } from "vitest";
import {
	createRoomMock,
	createRoomPickerDeviceMock,
} from "@/testing/mocks/rooms.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomListItem } from "../RoomListItem";

describe("RoomListItem Integration Tests", () => {
	it("RoomListItem_ClickOnItem_ShouldCallOnSelectWithRoomId", async () => {
		// Arrange
		const room = createRoomMock({ id: "room-42" });
		const onSelect = vi.fn();
		const user = userEvent.setup();

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={[]}
				isSelected={false}
				onSelect={onSelect}
				onDelete={vi.fn()}
				viewMode="cards"
			/>,
		);
		await user.click(screen.getByText(room.name));

		// Assert
		expect(onSelect).toHaveBeenCalledWith("room-42");
	});

	it("RoomListItem_ClickDeleteButton_ShouldCallOnDeleteWithoutTriggeringOnSelect", async () => {
		// Arrange
		const room = createRoomMock();
		const onSelect = vi.fn();
		const onDelete = vi.fn();
		const user = userEvent.setup();

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={[]}
				isSelected={false}
				onSelect={onSelect}
				onDelete={onDelete}
				viewMode="cards"
			/>,
		);
		await user.click(
			screen.getByRole("button", { name: `Excluir ambiente ${room.name}` }),
		);

		// Assert — stopPropagation impede o clique de também disparar onSelect
		expect(onDelete).toHaveBeenCalledWith(room);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("RoomListItem_SingleDeviceNoAutomations_ShouldRenderSingularDeviceCountOnly", () => {
		// Arrange
		const room = createRoomMock({ automationCount: 0 });
		const devices = [createRoomPickerDeviceMock()];

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={devices}
				isSelected={false}
				onSelect={vi.fn()}
				onDelete={vi.fn()}
				viewMode="cards"
			/>,
		);

		// Assert
		expect(screen.getByText("1 dispositivo")).toBeInTheDocument();
		expect(screen.queryByText(/automaç/)).not.toBeInTheDocument();
	});

	it("RoomListItem_MultipleDevicesAndAutomations_ShouldRenderPluralCounts", () => {
		// Arrange
		const room = createRoomMock({ automationCount: 2 });
		const devices = [
			createRoomPickerDeviceMock({ id: "d1" }),
			createRoomPickerDeviceMock({ id: "d2" }),
		];

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={devices}
				isSelected={false}
				onSelect={vi.fn()}
				onDelete={vi.fn()}
				viewMode="cards"
			/>,
		);

		// Assert
		expect(
			screen.getByText("2 dispositivos · 2 automações"),
		).toBeInTheDocument();
	});

	it("RoomListItem_OfflineDeviceInCardsMode_ShouldRenderAlertIconNextToName", () => {
		// Arrange
		const room = createRoomMock();
		const devices = [createRoomPickerDeviceMock({ isOnline: false })];

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={devices}
				isSelected={false}
				onSelect={vi.fn()}
				onDelete={vi.fn()}
				viewMode="cards"
			/>,
		);

		// Assert — reforço via ícone com aria-label, não só cor
		expect(screen.getByLabelText("1 dispositivo offline")).toBeInTheDocument();
	});

	it("RoomListItem_OfflineDeviceInListMode_ShouldRenderOfflineCountBadgeInsteadOfNameIcon", () => {
		// Arrange
		const room = createRoomMock();
		const devices = [createRoomPickerDeviceMock({ isOnline: false })];

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={devices}
				isSelected={false}
				onSelect={vi.fn()}
				onDelete={vi.fn()}
				viewMode="list"
			/>,
		);

		// Assert — no modo lista o alerta ao lado do nome não aparece, só o badge
		expect(
			screen.queryByLabelText("1 dispositivo offline"),
		).not.toBeInTheDocument();
	});

	it("RoomListItem_NoDevicesOffline_ShouldNotRenderOfflineIndicator", () => {
		// Arrange
		const room = createRoomMock();
		const devices = [createRoomPickerDeviceMock({ isOnline: true })];

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={devices}
				isSelected={false}
				onSelect={vi.fn()}
				onDelete={vi.fn()}
				viewMode="cards"
			/>,
		);

		// Assert
		expect(screen.queryByLabelText(/offline/)).not.toBeInTheDocument();
	});

	it("RoomListItem_IsSelected_ShouldSetAriaCurrentTrue", () => {
		// Arrange
		const room = createRoomMock();

		// Act
		renderWithProviders(
			<RoomListItem
				room={room}
				devices={[]}
				isSelected={true}
				onSelect={vi.fn()}
				onDelete={vi.fn()}
				viewMode="cards"
			/>,
		);

		// Assert
		expect(
			screen.getByRole("button", { name: /^Sala de Estar/ }),
		).toHaveAttribute("aria-current", "true");
	});
});
