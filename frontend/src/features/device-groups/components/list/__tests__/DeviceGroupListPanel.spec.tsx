import { describe, expect, it, vi } from "vitest";
import { createDeviceGroupMock } from "@/testing/mocks/device-groups.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DeviceGroupListPanel } from "../DeviceGroupListPanel";

function renderPanel(
	overrides?: Partial<Parameters<typeof DeviceGroupListPanel>[0]>,
) {
	const props = {
		groups: [],
		selectedId: null,
		onSelect: vi.fn(),
		onDelete: vi.fn(),
		onCreate: vi.fn(),
		viewMode: "cards" as const,
		onViewModeChange: vi.fn(),
		query: "",
		onQueryChange: vi.fn(),
		...overrides,
	};
	return { props, ...renderWithProviders(<DeviceGroupListPanel {...props} />) };
}

describe("DeviceGroupListPanel Integration Tests", () => {
	it("DeviceGroupListPanel_NoGroups_ShouldRenderEmptyState", () => {
		// Act
		renderPanel({ groups: [] });

		// Assert
		expect(screen.getByText("Nenhum grupo encontrado.")).toBeInTheDocument();
	});

	it("DeviceGroupListPanel_WithGroups_ShouldRenderEachGroupItem", () => {
		// Arrange
		const groups = [
			createDeviceGroupMock({ id: "group-1", name: "Sala" }),
			createDeviceGroupMock({ id: "group-2", name: "Quarto" }),
		];

		// Act
		renderPanel({ groups });

		// Assert
		expect(screen.getByText("Sala")).toBeInTheDocument();
		expect(screen.getByText("Quarto")).toBeInTheDocument();
		expect(
			screen.queryByText("Nenhum grupo encontrado."),
		).not.toBeInTheDocument();
	});

	it("DeviceGroupListPanel_ClickGroupItem_ShouldCallOnSelectWithGroupId", async () => {
		// Arrange
		const groups = [createDeviceGroupMock({ id: "group-1", name: "Sala" })];
		const user = userEvent.setup();
		const { props } = renderPanel({ groups });

		// Act
		await user.click(screen.getByText("Sala"));

		// Assert
		expect(props.onSelect).toHaveBeenCalledWith("group-1");
	});

	it("DeviceGroupListPanel_TypeInSearch_ShouldCallOnQueryChange", async () => {
		// Arrange
		const user = userEvent.setup();
		const { props } = renderPanel();

		// Act
		await user.type(screen.getByPlaceholderText("Buscar grupo..."), "s");

		// Assert
		expect(props.onQueryChange).toHaveBeenCalledWith("s");
	});

	it("DeviceGroupListPanel_ClickListViewToggle_ShouldCallOnViewModeChangeWithList", async () => {
		// Arrange
		const user = userEvent.setup();
		const { props } = renderPanel({ viewMode: "cards" });

		// Act
		await user.click(screen.getByRole("button", { name: "Ver como lista" }));

		// Assert
		expect(props.onViewModeChange).toHaveBeenCalledWith("list");
	});

	it("DeviceGroupListPanel_ClickNewGroupButton_ShouldCallOnCreate", async () => {
		// Arrange
		const user = userEvent.setup();
		const { props } = renderPanel();

		// Act
		await user.click(screen.getByRole("button", { name: "Novo grupo" }));

		// Assert
		expect(props.onCreate).toHaveBeenCalledTimes(1);
	});
});
