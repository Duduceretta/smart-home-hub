import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScenesUIStore } from "@/features/scenes/store/scenes-ui.store";
import {
	createSceneActivationResultMock,
	createSceneDeviceMock,
	createSceneItemMock,
	createSceneMock,
} from "@/testing/mocks/scenes.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/testing/test-utils";
import { SceneEditorSheet } from "../SceneEditorSheet";

const lamp = createSceneDeviceMock({
	id: "lamp",
	name: "Luz da Sala",
	type: 1,
	integrationType: 8,
	room: "Sala",
	isOn: true,
	brightness: 70,
});
const plug = createSceneDeviceMock({
	id: "plug",
	name: "Tomada TV",
	type: 2,
	integrationType: 1,
	room: "Sala",
	isOn: false,
});
const mqttLight = createSceneDeviceMock({
	id: "mqtt-light",
	name: "Luz do Quarto",
	type: 1,
	integrationType: 1,
	room: "Quarto",
	isOn: true,
});
const sensor = createSceneDeviceMock({ id: "sensor", name: "Sensor", type: 3 });
const lock = createSceneDeviceMock({ id: "lock", name: "Fechadura", type: 6 });

function mockDevices(devices = [lamp, plug, mqttLight, sensor, lock]) {
	server.use(
		http.get("*/api/devices", () => HttpResponse.json({ items: devices })),
	);
}

function captureBodies() {
	const calls: { method: string; url: string; body: unknown }[] = [];
	server.use(
		http.post("*/api/scenes", async ({ request }) => {
			calls.push({
				method: "POST",
				url: request.url,
				body: await request.json(),
			});
			return HttpResponse.json(
				{ message: "Cena criada com sucesso!", sceneId: "scene-new" },
				{ status: 201 },
			);
		}),
		http.put("*/api/scenes/:id", async ({ request }) => {
			calls.push({
				method: "PUT",
				url: request.url,
				body: await request.json(),
			});
			return new HttpResponse(null, { status: 204 });
		}),
		http.post("*/api/scenes/:id/activate", ({ request }) => {
			calls.push({ method: "ACTIVATE", url: request.url, body: null });
			return HttpResponse.json(createSceneActivationResultMock());
		}),
	);
	return calls;
}

const resetStore = () =>
	useScenesUIStore.setState({
		isEditorOpen: false,
		editingScene: null,
		seed: null,
	});

beforeEach(() => {
	vi.restoreAllMocks();
	resetStore();
	mockDevices();
});

describe("SceneEditorSheet", () => {
	it("SceneEditorSheet_StoreClosed_ShouldRenderNothing", () => {
		renderWithProviders(<SceneEditorSheet />);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("SceneEditorSheet_CreateMode_ShouldListOnlyDevicesASceneCanControlGroupedByRoom", async () => {
		useScenesUIStore.getState().openCreateEditor();
		renderWithProviders(<SceneEditorSheet />);

		expect(await screen.findByText("Luz da Sala")).toBeInTheDocument();
		expect(screen.getByText("Tomada TV")).toBeInTheDocument();
		expect(screen.getByText("Luz do Quarto")).toBeInTheDocument();
		expect(screen.queryByText("Sensor")).not.toBeInTheDocument();
		expect(screen.queryByText("Fechadura")).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Sala" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Quarto" })).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toHaveAccessibleName("Nova cena");
	});

	it("SceneEditorSheet_IncludingADevice_ShouldPrefillItWithItsCurrentState", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);

		await user.click(
			await screen.findByRole("checkbox", { name: "Incluir Luz da Sala" }),
		);

		expect(
			screen.getByRole("switch", { name: "Ligar Luz da Sala" }),
		).toBeChecked();
		const brightness = screen.getByRole("group", {
			name: "Brilho de Luz da Sala",
		});
		expect(within(brightness).getByText("70%")).toBeInTheDocument();
	});

	it("SceneEditorSheet_LightWithoutTuyaLocalControl_ShouldNotOfferBrightnessOrColor", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);

		await user.click(
			await screen.findByRole("checkbox", { name: "Incluir Luz do Quarto" }),
		);

		expect(
			screen.getByRole("switch", { name: "Ligar Luz do Quarto" }),
		).toBeChecked();
		expect(
			screen.queryByRole("group", { name: "Brilho de Luz do Quarto" }),
		).not.toBeInTheDocument();
	});

	it("SceneEditorSheet_DeviceThatTurnsOff_ShouldHideTheLightControls", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);
		await user.click(
			await screen.findByRole("checkbox", { name: "Incluir Luz da Sala" }),
		);

		await user.click(screen.getByRole("switch", { name: "Ligar Luz da Sala" }));

		expect(
			screen.queryByRole("group", { name: "Brilho de Luz da Sala" }),
		).not.toBeInTheDocument();
	});

	it("SceneEditorSheet_SubmitWithoutNameAndDevices_ShouldShowValidationAndNotCallTheApi", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const calls = captureBodies();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);
		await screen.findByText("Luz da Sala");

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("O nome da cena é obrigatório."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Selecione ao menos um dispositivo para a cena."),
		).toBeInTheDocument();
		expect(calls).toHaveLength(0);
	});

	it("SceneEditorSheet_FromASuggestion_ShouldPrefillNameAndIcon", async () => {
		useScenesUIStore
			.getState()
			.openCreateEditor({ name: "Boa Noite", icon: "moon" });
		renderWithProviders(<SceneEditorSheet />);

		expect(await screen.findByLabelText("Nome da cena")).toHaveValue(
			"Boa Noite",
		);
		expect(screen.getByRole("button", { name: "Noite" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("SceneEditorSheet_FillAndSave_ShouldPostTheSceneAndClose", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const calls = captureBodies();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);

		await user.type(
			await screen.findByLabelText("Nome da cena"),
			"Modo Cinema",
		);
		await user.click(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		);
		await user.click(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		);
		await user.click(screen.getByRole("switch", { name: "Ligar Tomada TV" }));
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]?.method).toBe("POST");
		expect(calls[0]?.body).toEqual({
			name: "Modo Cinema",
			icon: "sparkles",
			items: [
				{
					deviceId: "lamp",
					isOn: true,
					brightness: 70,
					colorHex: null,
					colorTempPercent: null,
				},
				{
					deviceId: "plug",
					isOn: true,
					brightness: null,
					colorHex: null,
					colorTempPercent: null,
				},
			],
		});
		await waitFor(() =>
			expect(useScenesUIStore.getState().isEditorOpen).toBe(false),
		);
	});

	it("SceneEditorSheet_SaveAndTest_ShouldCreateThenActivateTheNewScene", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const calls = captureBodies();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);

		await user.type(await screen.findByLabelText("Nome da cena"), "Teste");
		await user.click(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		);
		await user.click(screen.getByRole("button", { name: "Salvar e testar" }));

		await waitFor(() =>
			expect(calls.map((call) => call.method)).toEqual(["POST", "ACTIVATE"]),
		);
		expect(calls[1]?.url).toContain("/api/scenes/scene-new/activate");
	});

	it("SceneEditorSheet_ApiRejectsTheScene_ShouldShowTheMessageAndStayOpen", async () => {
		useScenesUIStore.getState().openCreateEditor();
		server.use(
			http.post("*/api/scenes", () =>
				HttpResponse.json(
					{
						title: "Scene.Validation.UnsupportedDeviceType",
						status: 422,
						detail:
							"Sensores, câmeras, fechaduras e alarmes não podem fazer parte de uma cena.",
					},
					{ status: 422 },
				),
			),
		);
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);
		await user.type(await screen.findByLabelText("Nome da cena"), "Segurança");
		await user.click(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		);

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText(
				"Sensores, câmeras, fechaduras e alarmes não podem fazer parte de uma cena.",
			),
		).toBeInTheDocument();
		expect(useScenesUIStore.getState().isEditorOpen).toBe(true);
	});

	it("SceneEditorSheet_EditMode_ShouldLoadTheSceneAndPutTheChanges", async () => {
		const scene = createSceneMock({
			id: "scene-1",
			name: "Antiga",
			icon: "sun",
			items: [
				createSceneItemMock({
					deviceId: "lamp",
					deviceName: "Luz da Sala",
					deviceType: 1,
					isOn: true,
					brightness: 40,
				}),
				createSceneItemMock({
					deviceId: "plug",
					deviceName: "Tomada TV",
					deviceType: 2,
					isOn: false,
				}),
			],
		});
		useScenesUIStore.getState().openEditEditor(scene);
		const calls = captureBodies();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);

		const nameInput = await screen.findByLabelText("Nome da cena");
		expect(nameInput).toHaveValue("Antiga");
		expect(screen.getByRole("dialog")).toHaveAccessibleName("Editar cena");
		// Os dispositivos chegam por request: a linha só aparece depois do fetch.
		expect(
			await screen.findByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		).toBeChecked();
		expect(
			within(
				screen.getByRole("group", { name: "Brilho de Luz da Sala" }),
			).getByText("40%"),
		).toBeInTheDocument();

		await user.clear(nameInput);
		await user.type(nameInput, "Nova");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]?.method).toBe("PUT");
		expect(calls[0]?.url).toContain("/api/scenes/scene-1");
		expect(calls[0]?.body).toMatchObject({
			name: "Nova",
			icon: "sun",
			items: [
				{ deviceId: "lamp", isOn: true, brightness: 40 },
				{ deviceId: "plug", isOn: false, brightness: null },
			],
		});
	});

	it("SceneEditorSheet_EditSaveAndTest_ShouldPutThenActivateTheSameScene", async () => {
		useScenesUIStore.getState().openEditEditor(
			createSceneMock({
				id: "scene-1",
				items: [
					createSceneItemMock({
						deviceId: "plug",
						deviceName: "Tomada TV",
						deviceType: 2,
					}),
				],
			}),
		);
		const calls = captureBodies();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);

		await user.click(
			await screen.findByRole("button", { name: "Salvar e testar" }),
		);

		await waitFor(() =>
			expect(calls.map((call) => call.method)).toEqual(["PUT", "ACTIVATE"]),
		);
		expect(calls[1]?.url).toContain("/api/scenes/scene-1/activate");
	});

	it("SceneEditorSheet_CancelWithoutChanges_ShouldCloseImmediately", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);
		await screen.findByText("Luz da Sala");

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(useScenesUIStore.getState().isEditorOpen).toBe(false);
	});

	it("SceneEditorSheet_CancelWithChanges_ShouldAskBeforeDiscarding", async () => {
		useScenesUIStore.getState().openCreateEditor();
		const user = userEvent.setup();
		renderWithProviders(<SceneEditorSheet />);
		await user.type(await screen.findByLabelText("Nome da cena"), "Rascunho");

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		const dialog = await screen.findByRole("alertdialog");
		expect(dialog).toHaveTextContent(
			"Descartar as alterações feitas nesta cena?",
		);

		await user.click(within(dialog).getByRole("button", { name: "Voltar" }));
		expect(useScenesUIStore.getState().isEditorOpen).toBe(true);

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		await user.click(
			within(await screen.findByRole("alertdialog")).getByRole("button", {
				name: "Descartar",
			}),
		);
		await waitFor(() =>
			expect(useScenesUIStore.getState().isEditorOpen).toBe(false),
		);
	});
});
