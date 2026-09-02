import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { useDeviceGroupsUIStore } from "@/features/device-groups/store/device-groups-ui.store";
import type {
	CreateDeviceGroupPayload,
	UpdateDeviceGroupPayload,
} from "@/features/device-groups/types/device-groups.types";
import {
	createDeviceGroupMock,
	createDeviceInGroupMock,
	createPickerDeviceMock,
} from "@/testing/mocks/device-groups.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { DeviceGroupFormDialog } from "../DeviceGroupFormDialog";

function mockPickerDevices(devices: unknown[]) {
	server.use(http.get("*/api/devices", () => HttpResponse.json(devices)));
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

describe("DeviceGroupFormDialog Integration Tests", () => {
	it("DeviceGroupFormDialog_CompleteCreateJourney_ShouldSubmitPayloadAndCloseDialog", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
			createPickerDeviceMock({ id: "dev-2", name: "Sensor Cozinha" }),
		]);
		let capturedPayload: CreateDeviceGroupPayload | null = null;
		server.use(
			http.post("*/api/device-groups", async ({ request }) => {
				capturedPayload = (await request.json()) as CreateDeviceGroupPayload;
				return HttpResponse.json(
					{ message: "Grupo criado com sucesso!", groupId: "group-new-1" },
					{ status: 201 },
				);
			}),
		);

		const user = userEvent.setup();
		useDeviceGroupsUIStore.getState().openCreateDialog();
		renderWithProviders(<DeviceGroupFormDialog />);

		// Act
		expect(
			await screen.findByRole("heading", { name: "Adicionar Novo Grupo" }),
		).toBeInTheDocument();

		await user.type(screen.getByLabelText("Nome do Grupo *"), "Todas as Luzes");

		const deviceCheckbox = await screen.findByRole("checkbox", {
			name: /Lâmpada Sala/,
		});
		await user.click(deviceCheckbox);

		await user.click(screen.getByRole("button", { name: "Registrar Grupo" }));

		// Assert
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});
		expect(capturedPayload).toEqual({
			name: "Todas as Luzes",
			icon: "layers",
			deviceIds: ["dev-1"],
		});

		await waitFor(() => {
			expect(useDeviceGroupsUIStore.getState().isCreateDialogOpen).toBe(false);
		});
	});

	it("DeviceGroupFormDialog_OpenForEdit_ShouldPrefillNameAndAlreadySelectedDevices", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
			createPickerDeviceMock({ id: "dev-2", name: "Sensor Cozinha" }),
		]);
		const group = createDeviceGroupMock({
			id: "group-edit-1",
			name: "Iluminação Geral",
			icon: "lightbulb",
			devices: [createDeviceInGroupMock({ id: "dev-1", name: "Lâmpada Sala" })],
		});

		// Act
		useDeviceGroupsUIStore.getState().openEditDialog(group);
		renderWithProviders(<DeviceGroupFormDialog />);

		// Assert
		expect(
			await screen.findByRole("heading", { name: "Editar Grupo" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Nome do Grupo *")).toHaveValue(
			"Iluminação Geral",
		);

		const selectedCheckbox = await screen.findByRole("checkbox", {
			name: /Lâmpada Sala/,
		});
		expect(selectedCheckbox).toBeChecked();
		const unselectedCheckbox = screen.getByRole("checkbox", {
			name: /Sensor Cozinha/,
		});
		expect(unselectedCheckbox).not.toBeChecked();
	});

	it("DeviceGroupFormDialog_EditChangeDeviceSelectionAndSave_ShouldSubmitFullUpdatedDeviceList", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
			createPickerDeviceMock({ id: "dev-2", name: "Sensor Cozinha" }),
		]);
		const group = createDeviceGroupMock({
			id: "group-edit-2",
			name: "Iluminação Geral",
			devices: [createDeviceInGroupMock({ id: "dev-1", name: "Lâmpada Sala" })],
		});
		let capturedPayload: UpdateDeviceGroupPayload | null = null;
		server.use(
			http.put("*/api/device-groups/:id", async ({ request }) => {
				capturedPayload = (await request.json()) as UpdateDeviceGroupPayload;
				return HttpResponse.json(
					{
						id: "group-edit-2",
						name: "Iluminação Geral",
						icon: "lightbulb",
						deviceIds: ["dev-2"],
					},
					{ status: 200 },
				);
			}),
		);
		const user = userEvent.setup();

		useDeviceGroupsUIStore.getState().openEditDialog(group);
		renderWithProviders(<DeviceGroupFormDialog />);

		// Act — desmarca o que já estava selecionado e marca o outro
		await user.click(
			await screen.findByRole("checkbox", { name: /Lâmpada Sala/ }),
		);
		await user.click(screen.getByRole("checkbox", { name: /Sensor Cozinha/ }));
		await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

		// Assert — payload completo (não um diff) reflete a nova seleção
		await waitFor(() => {
			expect(capturedPayload).not.toBeNull();
		});
		expect(capturedPayload).toEqual({
			name: "Iluminação Geral",
			icon: "lightbulb",
			deviceIds: ["dev-2"],
		});

		await waitFor(() => {
			expect(useDeviceGroupsUIStore.getState().editingGroup).toBeNull();
		});
	});

	it("DeviceGroupFormDialog_SubmitEmptyForm_ShouldShowZodErrorsWithoutHttpCall", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
		]);
		let httpCallCount = 0;
		server.use(
			http.post("*/api/device-groups", () => {
				httpCallCount++;
				return HttpResponse.json({}, { status: 201 });
			}),
		);
		const user = userEvent.setup();

		useDeviceGroupsUIStore.getState().openCreateDialog();
		renderWithProviders(<DeviceGroupFormDialog />);
		await screen.findByText("Lâmpada Sala");

		// Act
		await user.click(screen.getByRole("button", { name: "Registrar Grupo" }));

		// Assert
		expect(
			await screen.findByText("O nome do grupo é obrigatório."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Selecione pelo menos um dispositivo para o grupo."),
		).toBeInTheDocument();
		expect(httpCallCount).toBe(0);
	});

	it("DeviceGroupFormDialog_ApiReturns500OnCreate_ShouldShowErrorAndKeepDialogOpenWithEnteredData", async () => {
		// Arrange
		mockPickerDevices([
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
		]);
		server.use(
			http.post("*/api/device-groups", () =>
				HttpResponse.json(
					{
						title: "Internal Server Error",
						detail: "Falha ao salvar o grupo no banco.",
					},
					{ status: 500 },
				),
			),
		);
		const user = userEvent.setup();

		useDeviceGroupsUIStore.getState().openCreateDialog();
		renderWithProviders(<DeviceGroupFormDialog />);

		// Act
		await user.type(
			screen.getByLabelText("Nome do Grupo *"),
			"Grupo com Falha",
		);
		await user.click(
			await screen.findByRole("checkbox", { name: /Lâmpada Sala/ }),
		);
		await user.click(screen.getByRole("button", { name: "Registrar Grupo" }));

		// Assert
		expect(
			await screen.findByText("Falha ao salvar o grupo no banco."),
		).toBeInTheDocument();
		expect(useDeviceGroupsUIStore.getState().isCreateDialogOpen).toBe(true);
		expect(screen.getByLabelText("Nome do Grupo *")).toHaveValue(
			"Grupo com Falha",
		);
		expect(
			screen.getByRole("checkbox", { name: /Lâmpada Sala/ }),
		).toBeChecked();
	});
});
