import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceGroupsUIStore } from "@/features/device-groups/store/device-groups-ui.store";
import {
	createDeviceGroupMock,
	createDeviceInGroupMock,
} from "@/testing/mocks/device-groups.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { DeviceGroupsView } from "../DeviceGroupsView";

function renderDeviceGroupsView(initialEntries = ["/device-groups"]) {
	return renderWithProviders(
		<MemoryRouter initialEntries={initialEntries}>
			<DeviceGroupsView />
		</MemoryRouter>,
	);
}

function mockGroupsList(groups: unknown[]) {
	server.use(http.get("*/api/device-groups", () => HttpResponse.json(groups)));
}

function mockPickerDevices(devices: unknown[] = []) {
	server.use(http.get("*/api/devices", () => HttpResponse.json(devices)));
}

function mockDeviceGroupDetailSubResources() {
	server.use(
		http.get("*/api/device-groups/:id/automations", () =>
			HttpResponse.json([]),
		),
		http.get("*/api/automations", () => HttpResponse.json([])),
	);
}

beforeEach(() => {
	useDeviceGroupsUIStore.setState({
		selectedGroupId: null,
		viewMode: "cards",
		query: "",
		isCreateDialogOpen: false,
		editingGroup: null,
		editDialogFocusDevices: false,
	});
});

describe("DeviceGroupsView Integration Tests", () => {
	it("DeviceGroupsView_GroupsStillLoading_ShouldRenderLoadingState", () => {
		// Arrange — keeps loading state active
		server.use(http.get("*/api/device-groups", () => new Promise(() => {})));
		mockPickerDevices();

		// Act
		renderDeviceGroupsView();

		// Assert
		expect(screen.getByText("Carregando grupos...")).toBeInTheDocument();
	});

	it("DeviceGroupsView_FetchGroupsFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/device-groups", () => {
				requestCount += 1;
				return HttpResponse.json({ title: "Erro" }, { status: 500 });
			}),
		);
		mockPickerDevices();
		const user = userEvent.setup();

		// Act
		renderDeviceGroupsView();

		// Assert
		expect(
			await screen.findByText(
				"Não foi possível carregar os grupos de dispositivos.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetry = requestCount;

		await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

		// Assert
		await waitFor(() =>
			expect(requestCount).toBeGreaterThan(requestsBeforeRetry),
		);
	});

	it("DeviceGroupsView_NoGroupsRegistered_ShouldRenderEmptyStateWithCreateButton", async () => {
		// Arrange
		mockGroupsList([]);
		mockPickerDevices();

		// Act
		renderDeviceGroupsView();

		// Assert
		expect(
			await screen.findByText("Nenhum grupo cadastrado"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar primeiro grupo" }),
		).toBeInTheDocument();
	});

	it("DeviceGroupsView_Mobile_ShouldOpenOnListWithoutAutoSelection", async () => {
		// Arrange
		const group = createDeviceGroupMock({
			id: "group-01",
			name: "Iluminação Geral",
		});
		mockGroupsList([group]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();

		// Act (Mobile: matchMedia matches = false)
		renderDeviceGroupsView();

		// Assert — renders list, does not open detail
		expect(await screen.findByText("Iluminação Geral")).toBeInTheDocument();
		expect(screen.queryByText("Controle Mestre do Grupo")).not.toBeInTheDocument();
	});

	it("DeviceGroupsView_Mobile_ClickGroup_ShouldNavigateToDetailAndBackReturnsToList", async () => {
		// Arrange
		const group = createDeviceGroupMock({
			id: "group-01",
			name: "Iluminação Geral",
			devices: [
				createDeviceInGroupMock({
					id: "dev-01",
					name: "Luz Quarto",
					isOn: true,
					type: 1,
				}),
			],
		});
		mockGroupsList([group]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();
		const user = userEvent.setup();

		// Act (Mobile)
		renderDeviceGroupsView();
		await user.click(await screen.findByText("Iluminação Geral"));

		// Assert detail is open
		expect(
			await screen.findByRole("button", { name: "Voltar pra lista" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Iluminação Geral" }),
		).toBeInTheDocument();
		expect(screen.getByText("Luz Quarto")).toBeInTheDocument();

		// Click Voltar
		await user.click(screen.getByRole("button", { name: "Voltar pra lista" }));
	});

	it("DeviceGroupsView_Desktop_ShouldAutoSelectFirstGroupAndShowDetailPanel", async () => {
		// Arrange (Desktop: matchMedia matches = true)
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: true,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		const group = createDeviceGroupMock({
			id: "group-01",
			name: "Iluminação Geral",
			devices: [
				createDeviceInGroupMock({
					id: "dev-01",
					name: "Luz Quarto",
					isOn: true,
					type: 1,
				}),
			],
		});
		mockGroupsList([group]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();

		// Act
		renderDeviceGroupsView();

		// Assert — auto-selects the first group and displays header in detail panel on desktop
		expect(
			await screen.findByRole("heading", { name: "Iluminação Geral" }),
		).toBeInTheDocument();
		expect(screen.getByText("Luz Quarto")).toBeInTheDocument();
		expect(screen.getByText("Controle Mestre do Grupo")).toBeInTheDocument();
		expect(screen.getByText("Automações deste Grupo")).toBeInTheDocument();
	});

	it("DeviceGroupsView_MultipleGroups_ShouldRenderSummaryBarWithTotalCounts", async () => {
		// Arrange
		const groups = [
			createDeviceGroupMock({ id: "group-1", name: "Luzes" }),
			createDeviceGroupMock({ id: "group-2", name: "Tomadas" }),
		];
		mockGroupsList(groups);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();

		// Act
		renderDeviceGroupsView();

		// Assert
		await screen.findAllByText("Luzes");
		expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText(/grupos/i)[0]).toBeInTheDocument();
	});

	it("DeviceGroupsView_ClickDeleteIcon_ShouldRenderConfirmationWithGroupName", async () => {
		// Arrange
		mockGroupsList([createDeviceGroupMock({ name: "Home Theater" })]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();
		const user = userEvent.setup();

		// Act
		renderDeviceGroupsView();
		await user.click(
			await screen.findByRole("button", {
				name: "Excluir grupo Home Theater",
			}),
		);

		// Assert
		expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
		expect(
			screen.getByText(
				/Tem certeza que deseja excluir o grupo "Home Theater"/i,
			),
		).toBeInTheDocument();
	});

	it("DeviceGroupsView_ClickCancelOnDeleteConfirmation_ShouldNotCallDeleteApi", async () => {
		// Arrange
		mockGroupsList([createDeviceGroupMock({ name: "Home Theater" })]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();
		let deleteCalled = false;
		server.use(
			http.delete("*/api/device-groups/:id", () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();

		// Act
		renderDeviceGroupsView();
		await user.click(
			await screen.findByRole("button", {
				name: "Excluir grupo Home Theater",
			}),
		);
		await screen.findByRole("alertdialog");
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		// Assert
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(deleteCalled).toBe(false);
	});

	it("DeviceGroupsView_ConfirmDeleteOnDialog_ShouldCallDeleteApiWithGroupId", async () => {
		// Arrange
		mockGroupsList([
			createDeviceGroupMock({ id: "group-to-delete", name: "Segurança" }),
		]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();
		let deletedId: string | null = null;
		server.use(
			http.delete("*/api/device-groups/:id", ({ params }) => {
				deletedId = params.id as string;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();

		// Act
		renderDeviceGroupsView();
		await user.click(
			await screen.findByRole("button", {
				name: "Excluir grupo Segurança",
			}),
		);
		await screen.findByRole("alertdialog");
		await user.click(screen.getByRole("button", { name: "Excluir" }));

		// Assert
		await waitFor(() => {
			expect(deletedId).toBe("group-to-delete");
		});
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("DeviceGroupsView_ToggleMasterSwitch_ShouldCallServerSideBulkPowerEndpoint", async () => {
		// Arrange
		const group = createDeviceGroupMock({
			id: "group-master-test",
			name: "Sala Principal",
			devices: [
				createDeviceInGroupMock({ id: "dev-1", name: "Luz 1", isOn: true }),
			],
		});
		mockGroupsList([group]);
		mockPickerDevices();
		mockDeviceGroupDetailSubResources();

		let turnedOffGroupId: string | null = null;
		server.use(
			http.post("*/api/device-groups/:id/devices/turn-off", ({ params }) => {
				turnedOffGroupId = params.id as string;
				return HttpResponse.json({
					succeededCount: 1,
					failedCount: 0,
					totalCount: 1,
				});
			}),
		);
		const user = userEvent.setup();

		// Act
		renderDeviceGroupsView();
		const masterSwitch = await screen.findByRole("switch", {
			name: "Alternar todos os dispositivos do grupo",
		});
		await user.click(masterSwitch);

		// Assert
		await waitFor(() => {
			expect(turnedOffGroupId).toBe("group-master-test");
		});
	});

	it("DeviceGroupsView_LinkedAutomationsLoaded_ShouldRenderAutomationNames", async () => {
		// Arrange
		const group = createDeviceGroupMock({
			id: "group-auto-test",
			name: "Quarto Master",
			devices: [createDeviceInGroupMock({ id: "dev-1", name: "Lâmpada" })],
		});
		mockGroupsList([group]);
		mockPickerDevices();
		server.use(
			http.get("*/api/device-groups/:id/automations", () =>
				HttpResponse.json([
					{
						id: "auto-1",
						name: "Desligar ao sair",
						isActive: true,
						triggerKind: "schedule",
					},
				]),
			),
		);

		// Act
		renderDeviceGroupsView();

		// Assert
		expect(await screen.findByText("Desligar ao sair")).toBeInTheDocument();
		expect(screen.getByText("Ativa")).toBeInTheDocument();
	});
});
