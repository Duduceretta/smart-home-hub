import { HttpResponse, http } from "msw";
import {
	createMemoryRouter,
	RouterProvider,
	useLocation,
} from "react-router-dom";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLOR_AMBER } from "@/features/scenes/constants/scene-colors";
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
import { SceneEditorPage } from "../SceneEditorPage";

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
const tv = createSceneDeviceMock({
	id: "tv",
	name: "Smart-TV-Pro",
	type: 8,
	integrationType: 4,
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

function mockDevices(devices = [lamp, plug, tv, mqttLight, sensor, lock]) {
	server.use(
		http.get("*/api/devices", () => HttpResponse.json({ items: devices })),
	);
}

function mockScenes(scenes: unknown[]) {
	server.use(
		http.get("*/api/scenes", () => HttpResponse.json({ items: scenes })),
	);
}

function captureCalls() {
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
		http.delete("*/api/scenes/:id", ({ request }) => {
			calls.push({ method: "DELETE", url: request.url, body: null });
			return new HttpResponse(null, { status: 204 });
		}),
	);
	return calls;
}

function LocationProbe() {
	const location = useLocation();
	return (
		<div data-testid="location">{location.pathname + location.search}</div>
	);
}

function renderEditor(path: string) {
	const router = createMemoryRouter(
		[
			{ path: "/scenes", element: <LocationProbe /> },
			{ path: "/scenes/new", element: <SceneEditorPage /> },
			{ path: "/scenes/:id/edit", element: <SceneEditorPage /> },
		],
		{ initialEntries: [path] },
	);

	return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}

const savedScene = createSceneMock({
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

beforeEach(() => {
	vi.restoreAllMocks();
	mockDevices();
	mockScenes([]);
});

describe("SceneEditorPage · criar", () => {
	it("SceneEditorPage_CreateMode_ShouldShowBreadcrumbAndOnlyControllableDevicesByRoom", async () => {
		renderEditor("/scenes/new");

		expect(await screen.findByText("Luz da Sala")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Nova cena" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Cenas" })).toBeInTheDocument();
		expect(screen.getByText("Tomada TV")).toBeInTheDocument();
		expect(screen.getByText("Luz do Quarto")).toBeInTheDocument();
		expect(screen.queryByText("Sensor")).not.toBeInTheDocument();
		expect(screen.queryByText("Fechadura")).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Sala" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Quarto" })).toBeInTheDocument();
	});

	it("SceneEditorPage_IncludingADevice_ShouldPrefillItWithItsCurrentState", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");

		await user.click(
			await screen.findByRole("checkbox", { name: "Incluir Luz da Sala" }),
		);

		expect(
			screen.getByRole("switch", { name: "Ligar Luz da Sala" }),
		).toBeChecked();
		expect(
			within(
				screen.getByRole("group", { name: "Brilho de Luz da Sala" }),
			).getByText("70%"),
		).toBeInTheDocument();
	});

	it("SceneEditorPage_LightWithoutTuyaLocalControl_ShouldNotOfferBrightnessOrColor", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");

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

	it("SceneEditorPage_DeviceThatTurnsOff_ShouldHideTheLightControls", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await user.click(
			await screen.findByRole("checkbox", { name: "Incluir Luz da Sala" }),
		);

		await user.click(screen.getByRole("switch", { name: "Ligar Luz da Sala" }));

		expect(
			screen.queryByRole("group", { name: "Brilho de Luz da Sala" }),
		).not.toBeInTheDocument();
	});

	it("SceneEditorPage_SubmitWithoutNameAndDevices_ShouldShowValidationAndNotCallTheApi", async () => {
		const calls = captureCalls();
		const user = userEvent.setup();
		renderEditor("/scenes/new");
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

	it("SceneEditorPage_FillAndSave_ShouldPostTheSceneAndGoBackToTheListSelectingIt", async () => {
		const calls = captureCalls();
		const user = userEvent.setup();
		const { router } = renderEditor("/scenes/new");

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
			expect(
				router.state.location.pathname + router.state.location.search,
			).toBe("/scenes?scene=scene-new"),
		);
	});

	it("SceneEditorPage_SaveAndTest_ShouldCreateThenActivateTheNewScene", async () => {
		const calls = captureCalls();
		const user = userEvent.setup();
		renderEditor("/scenes/new");

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

	it("SceneEditorPage_ApiRejectsTheScene_ShouldShowTheMessageAndStayOnThePage", async () => {
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
		const { router } = renderEditor("/scenes/new");
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
		expect(router.state.location.pathname).toBe("/scenes/new");
	});
});

describe("SceneEditorPage · editar", () => {
	it("SceneEditorPage_EditMode_ShouldLoadTheSceneAndPutTheChanges", async () => {
		mockScenes([savedScene]);
		const calls = captureCalls();
		const user = userEvent.setup();
		renderEditor("/scenes/scene-1/edit");

		const nameInput = await screen.findByDisplayValue("Antiga");
		expect(
			screen.getByRole("heading", { name: "Editar Antiga" }),
		).toBeInTheDocument();
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

	it("SceneEditorPage_EditSaveAndTest_ShouldPutThenActivateTheSameScene", async () => {
		mockScenes([savedScene]);
		const calls = captureCalls();
		const user = userEvent.setup();
		renderEditor("/scenes/scene-1/edit");
		await screen.findByDisplayValue("Antiga");

		await user.click(screen.getByRole("button", { name: "Salvar e testar" }));

		await waitFor(() =>
			expect(calls.map((call) => call.method)).toEqual(["PUT", "ACTIVATE"]),
		);
		expect(calls[1]?.url).toContain("/api/scenes/scene-1/activate");
	});

	it("SceneEditorPage_SceneThatDoesNotExist_ShouldExplainAndOfferToGoBack", async () => {
		mockScenes([savedScene]);
		const user = userEvent.setup();
		const { router } = renderEditor("/scenes/ghost/edit");

		expect(await screen.findByText(/Cena não encontrada/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Voltar para Cenas" }));

		expect(router.state.location.pathname).toBe("/scenes");
	});

	it("SceneEditorPage_DeleteConfirmed_ShouldCallTheApiAndGoBackToTheList", async () => {
		mockScenes([savedScene]);
		const calls = captureCalls();
		const user = userEvent.setup();
		const { router } = renderEditor("/scenes/scene-1/edit");
		await screen.findByDisplayValue("Antiga");

		await user.click(screen.getByRole("button", { name: "Excluir cena" }));
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		await waitFor(() =>
			expect(calls.map((call) => call.method)).toEqual(["DELETE"]),
		);
		await waitFor(() => expect(router.state.location.pathname).toBe("/scenes"));
	});
});

describe("SceneEditorPage · sair", () => {
	it("SceneEditorPage_CancelWithoutChanges_ShouldGoBackImmediately", async () => {
		const user = userEvent.setup();
		const { router } = renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		await waitFor(() => expect(router.state.location.pathname).toBe("/scenes"));
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("SceneEditorPage_CancelWithChanges_ShouldAskBeforeDiscarding", async () => {
		const user = userEvent.setup();
		const { router } = renderEditor("/scenes/new");
		await user.type(await screen.findByLabelText("Nome da cena"), "Rascunho");

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		const dialog = await screen.findByRole("alertdialog");
		expect(dialog).toHaveTextContent(
			"Descartar as alterações feitas nesta cena?",
		);

		await user.click(within(dialog).getByRole("button", { name: "Voltar" }));
		expect(router.state.location.pathname).toBe("/scenes/new");

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		await user.click(
			within(await screen.findByRole("alertdialog")).getByRole("button", {
				name: "Descartar",
			}),
		);
		await waitFor(() => expect(router.state.location.pathname).toBe("/scenes"));
	});

	it("SceneEditorPage_NavigatingAwayWithChanges_ShouldAskInsteadOfLosingTheDraft", async () => {
		const user = userEvent.setup();
		const { router } = renderEditor("/scenes/new");
		await user.type(await screen.findByLabelText("Nome da cena"), "Rascunho");

		await router.navigate("/scenes");

		const dialog = await screen.findByRole("alertdialog");
		expect(router.state.location.pathname).toBe("/scenes/new");
		await user.click(within(dialog).getByRole("button", { name: "Descartar" }));
		await waitFor(() => expect(router.state.location.pathname).toBe("/scenes"));
	});

	it("SceneEditorPage_NavigatingAwayWithoutChanges_ShouldNotAsk", async () => {
		const { router } = renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");

		await router.navigate("/scenes");

		expect(router.state.location.pathname).toBe("/scenes");
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});
});

describe("SceneEditorPage · predefinições", () => {
	it("SceneEditorPage_PresetFromTheUrl_ShouldPrefillNameIconAndDevices", async () => {
		const calls = captureCalls();
		const user = userEvent.setup();
		renderEditor("/scenes/new?preset=relax");

		expect(await screen.findByDisplayValue("Relaxar")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Smart-TV-Pro" }),
		).toBeChecked();
		expect(
			within(
				screen.getByRole("group", { name: "Brilho de Luz da Sala" }),
			).getByText("30%"),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Âmbar" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]?.body).toMatchObject({
			name: "Relaxar",
			items: expect.arrayContaining([
				expect.objectContaining({
					deviceId: "lamp",
					brightness: 30,
					colorHex: COLOR_AMBER,
				}),
				expect.objectContaining({ deviceId: "tv", isOn: false }),
			]),
		});
	});

	it("SceneEditorPage_UsingAPresetOnAnEmptyForm_ShouldApplyWithoutAskingAndKeepAnExistingName", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		const nameInput = await screen.findByLabelText("Nome da cena");
		await user.type(nameInput, "Minha cena");

		await user.click(
			screen.getByRole("button", { name: "Usar predefinição Jantar" }),
		);

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(nameInput).toHaveValue("Minha cena");
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).toBeChecked();
		expect(
			within(
				screen.getByRole("group", { name: "Brilho de Luz da Sala" }),
			).getByText("60%"),
		).toBeInTheDocument();
	});

	it("SceneEditorPage_UsingAPresetWhenDevicesAreAlreadySelected_ShouldAskBeforeReplacing", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await user.click(
			await screen.findByRole("checkbox", { name: "Incluir Tomada TV" }),
		);

		await user.click(
			screen.getByRole("button", { name: "Usar predefinição Relaxar" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Manter" }));

		expect(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).not.toBeChecked();

		await user.click(
			screen.getByRole("button", { name: "Usar predefinição Relaxar" }),
		);
		await user.click(
			within(await screen.findByRole("alertdialog")).getByRole("button", {
				name: "Substituir",
			}),
		);

		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		).not.toBeChecked();
	});

	it("SceneEditorPage_AppliedPreset_ShouldToastAtTheTopSoItNeverCoversTheActionBar", async () => {
		const toastInfo = vi.spyOn(toast, "info");
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");

		await user.click(
			screen.getByRole("button", { name: "Usar predefinição Jantar" }),
		);

		expect(toastInfo).toHaveBeenCalledWith(
			"Predefinição Jantar aplicada. Revise e salve.",
			{ position: "top-center" },
		);
	});

	it("SceneEditorPage_PresetWithNoCompatibleDevice_ShouldWarnAndChangeNothing", async () => {
		mockDevices([plug]);
		const toastWarning = vi.spyOn(toast, "warning");
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Tomada TV");

		await user.click(
			screen.getByRole("button", { name: "Usar predefinição Relaxar" }),
		);

		// Topo: no canto inferior direito o toast cobriria os botões da barra de ações.
		expect(toastWarning).toHaveBeenCalledWith(
			"Você não tem dispositivos compatíveis com a predefinição Relaxar.",
			{ position: "top-center" },
		);
		expect(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		).not.toBeChecked();
	});
});

describe("SceneEditorPage · atalhos e busca", () => {
	it("SceneEditorPage_DeviceSearch_ShouldFilterByDeviceNameOrRoom", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");

		await user.type(screen.getByLabelText("Buscar dispositivo"), "quarto");

		expect(screen.getByText("Luz do Quarto")).toBeInTheDocument();
		expect(screen.queryByText("Luz da Sala")).not.toBeInTheDocument();

		await user.clear(screen.getByLabelText("Buscar dispositivo"));
		await user.type(screen.getByLabelText("Buscar dispositivo"), "zzz");
		expect(
			screen.getByText("Nenhum dispositivo encontrado."),
		).toBeInTheDocument();
	});

	it("SceneEditorPage_AllLightsShortcut_ShouldIncludeEveryLightWithItsCurrentState", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");

		await user.click(screen.getByRole("button", { name: "Todas as luzes" }));

		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz do Quarto" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		).not.toBeChecked();
	});

	it("SceneEditorPage_TurnEverythingOffShortcut_ShouldSwitchEverySelectedDeviceOff", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");
		await user.click(screen.getByRole("button", { name: "Todas as luzes" }));

		await user.click(
			screen.getByRole("button", { name: "Desligar tudo na cena" }),
		);

		expect(
			screen.getByRole("switch", { name: "Ligar Luz da Sala" }),
		).not.toBeChecked();
		expect(
			screen.getByRole("switch", { name: "Ligar Luz do Quarto" }),
		).not.toBeChecked();
	});

	it("SceneEditorPage_ClearShortcut_ShouldUnselectEverything", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");
		await user.click(screen.getByRole("button", { name: "Todas as luzes" }));

		await user.click(screen.getByRole("button", { name: "Limpar" }));

		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).not.toBeChecked();
	});

	it("SceneEditorPage_RoomShortcuts_ShouldSelectAndUnselectEveryDeviceOfThatRoom", async () => {
		const user = userEvent.setup();
		renderEditor("/scenes/new");
		await screen.findByText("Luz da Sala");

		await user.click(
			screen.getByRole("button", { name: "Marcar todos de Sala" }),
		);
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Tomada TV" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Smart-TV-Pro" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz do Quarto" }),
		).not.toBeChecked();

		await user.click(
			screen.getByRole("button", { name: "Desmarcar todos de Sala" }),
		);
		expect(
			screen.getByRole("checkbox", { name: "Incluir Luz da Sala" }),
		).not.toBeChecked();
	});
});
