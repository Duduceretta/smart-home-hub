import { describe, expect, it, vi } from "vitest";
import type { Room } from "@/features/rooms/types/rooms.types";
import { createRoomMock } from "@/testing/mocks/rooms.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomListPanel } from "../RoomListPanel";

function renderPanel(
	overrides?: Partial<React.ComponentProps<typeof RoomListPanel>>,
) {
	const defaultProps: React.ComponentProps<typeof RoomListPanel> = {
		rooms: [createRoomMock()],
		devicesByRoom: new Map(),
		selectedId: null,
		onSelect: vi.fn(),
		onDelete: vi.fn(),
		onCreate: vi.fn(),
		viewMode: "cards",
		onViewModeChange: vi.fn(),
		query: "",
		onQueryChange: vi.fn(),
	};

	return renderWithProviders(
		<RoomListPanel {...defaultProps} {...overrides} />,
	);
}

describe("RoomListPanel Integration Tests", () => {
	it("RoomListPanel_NoRooms_ShouldRenderEmptyState", () => {
		// Arrange & Act
		renderPanel({ rooms: [] });

		// Assert
		expect(screen.getByText("Nenhum ambiente encontrado.")).toBeInTheDocument();
	});

	it("RoomListPanel_SingleRoom_ShouldRenderSingularRoomCount", () => {
		// Arrange & Act
		renderPanel({ rooms: [createRoomMock()] });

		// Assert
		expect(screen.getByText("1 ambiente")).toBeInTheDocument();
	});

	it("RoomListPanel_MultipleRooms_ShouldRenderPluralRoomCountAndEachItem", () => {
		// Arrange
		const rooms: Room[] = [
			createRoomMock({ id: "room-1", name: "Sala" }),
			createRoomMock({ id: "room-2", name: "Cozinha" }),
		];

		// Act
		renderPanel({ rooms });

		// Assert
		expect(screen.getByText("2 ambientes")).toBeInTheDocument();
		expect(screen.getByText("Sala")).toBeInTheDocument();
		expect(screen.getByText("Cozinha")).toBeInTheDocument();
	});

	it("RoomListPanel_ClickNewRoomButton_ShouldCallOnCreate", async () => {
		// Arrange
		const onCreate = vi.fn();
		const user = userEvent.setup();
		renderPanel({ onCreate });

		// Act
		await user.click(screen.getByRole("button", { name: "Novo ambiente" }));

		// Assert
		expect(onCreate).toHaveBeenCalledTimes(1);
	});

	it("RoomListPanel_ClickAddRoomGhostCard_ShouldCallOnCreate", async () => {
		// Arrange
		const onCreate = vi.fn();
		const user = userEvent.setup();
		renderPanel({ onCreate });

		// Act
		await user.click(screen.getByText("Adicionar Ambiente"));

		// Assert
		expect(onCreate).toHaveBeenCalledTimes(1);
	});

	it("RoomListPanel_TypeInSearchInput_ShouldCallOnQueryChangeWithTypedValue", async () => {
		// Arrange
		const onQueryChange = vi.fn();
		const user = userEvent.setup();
		renderPanel({ onQueryChange });

		// Act
		await user.type(screen.getByPlaceholderText("Buscar ambiente..."), "Coz");

		// Assert — cada keystroke dispara um onChange controlado
		expect(onQueryChange).toHaveBeenCalledWith("C");
		expect(onQueryChange).toHaveBeenCalledWith("o");
		expect(onQueryChange).toHaveBeenCalledWith("z");
	});

	it("RoomListPanel_ClickCardsViewButton_ShouldCallOnViewModeChangeWithCards", async () => {
		// Arrange
		const onViewModeChange = vi.fn();
		const user = userEvent.setup();
		renderPanel({ onViewModeChange, viewMode: "list" });

		// Act
		await user.click(screen.getByRole("button", { name: "Ver como cards" }));

		// Assert
		expect(onViewModeChange).toHaveBeenCalledWith("cards");
	});

	it("RoomListPanel_ClickListViewButton_ShouldCallOnViewModeChangeWithList", async () => {
		// Arrange
		const onViewModeChange = vi.fn();
		const user = userEvent.setup();
		renderPanel({ onViewModeChange, viewMode: "cards" });

		// Act
		await user.click(screen.getByRole("button", { name: "Ver como lista" }));

		// Assert
		expect(onViewModeChange).toHaveBeenCalledWith("list");
	});

	it("RoomListPanel_ClickRoomItem_ShouldCallOnSelectWithRoomId", async () => {
		// Arrange
		const room = createRoomMock({ id: "room-99", name: "Escritório" });
		const onSelect = vi.fn();
		const user = userEvent.setup();
		renderPanel({ rooms: [room], onSelect });

		// Act
		await user.click(screen.getByText("Escritório"));

		// Assert
		expect(onSelect).toHaveBeenCalledWith("room-99");
	});
});
