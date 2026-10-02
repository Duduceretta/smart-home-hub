import { HttpResponse, http } from "msw";
import { MemoryRouter, useLocation } from "react-router-dom";
import { toast } from "sonner";
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
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/testing/test-utils";
import { ScenesView } from "../ScenesView";

const lamp = createSceneDeviceMock({
	id: "lamp",
	name: "Luz da Sala",
	type: 1,
	integrationType: 8,
	room: "Sala",
	isOn: true,
	brightness: 40,
});
const tv = createSceneDeviceMock({
	id: "tv",
	name: "Smart-TV-Pro",
	type: 8,
	integrationType: 4,
	room: "Sala",
});
const bedLamp = createSceneDeviceMock({
	id: "bed",
	name: "Luz do Quarto",
	type: 1,
	integrationType: 8,
	room: "Quarto",
});
const hallLamp = createSceneDeviceMock({
	id: "hall",
	name: "Lâmpada do Corredor",
	type: 1,
	integrationType: 1,
	room: "Corredor",
	isOnline: false,
});
const DEVICES = [lamp, tv, bedLamp, hallLamp];

const itemOf = (
	device: typeof lamp,
	overrides: Partial<ReturnType<typeof createSceneItemMock>> = {},
) =>
	createSceneItemMock({
		deviceId: device.id,
		deviceName: device.name,
		deviceType: device.type,
		...overrides,
	});

const twoHoursAgo = () =>
	new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

const cinema = createSceneMock({
	id: "s1",
	name: "Modo Cinema",
	icon: "clapperboard",
	lastActivatedAt: twoHoursAgo(),
	items: [
		itemOf(lamp, { isOn: true, brightness: 40 }),
		itemOf(tv, { isOn: true }),
	],
});
const night = createSceneMock({
	id: "s2",
	name: "Boa Noite",
	icon: "moon",
	lastActivatedAt: null,
	items: [itemOf(bedLamp, { isOn: false }), itemOf(hallLamp, { isOn: false })],
});

function mockScenes(scenes: unknown[]) {
	server.use(
		http.get("*/api/scenes", () => HttpResponse.json({ items: scenes })),
	);
}

function LocationProbe() {
	const location = useLocation();
	return (
		<div data-testid="location">{location.pathname + location.search}</div>
	);
}

function renderView(path = "/scenes") {
	return renderWithProviders(
		<MemoryRouter initialEntries={[path]}>
			<ScenesView />
			<LocationProbe />
		</MemoryRouter>,
	);
}

const findRow = (name: string) =>
	screen.findByRole("button", { name: `Selecionar cena ${name}` });

const quickPanel = () => screen.getByRole("region", { name: "Edição rápida" });

beforeEach(() => {
	vi.restoreAllMocks();
	useScenesUIStore.setState({ viewMode: "list" });
	server.use(
		http.get("*/api/devices", () => HttpResponse.json({ items: DEVICES })),
	);
});

describe("ScenesView · lista", () => {
	it("ScenesView_ScenesStillLoading_ShouldRenderTheLoadingSkeleton", () => {
		server.use(http.get("*/api/scenes", () => new Promise(() => {})));

		renderView();

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("ScenesView_WithScenes_ShouldShowEachRowWithDeviceCountAndLastActivation", async () => {
		mockScenes([cinema, night]);

		renderView();

		expect(await findRow("Modo Cinema")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Selecionar cena Boa Noite" }),
		).toBeInTheDocument();
		expect(screen.getAllByText(/2 dispositivos/)).toHaveLength(2);
		expect(screen.getByText("Ativada há 2 horas")).toBeInTheDocument();
		expect(screen.getByText("Nunca ativada")).toBeInTheDocument();
	});

	it("ScenesView_NewSceneButton_ShouldGoToTheCreationPage", async () => {
		mockScenes([cinema]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");

		await user.click(screen.getByRole("button", { name: "Nova cena" }));

		expect(screen.getByTestId("location")).toHaveTextContent("/scenes/new");
	});

	it("ScenesView_ActivatingARow_ShouldCallTheApiAndToastTheOutcome", async () => {
		const toastSuccess = vi.spyOn(toast, "success");
		let activatedId: string | undefined;
		mockScenes([cinema]);
		server.use(
			http.post("*/api/scenes/:id/activate", ({ params }) => {
				activatedId = String(params.id);
				return HttpResponse.json(createSceneActivationResultMock());
			}),
		);
		const user = userEvent.setup();
		renderView();

		await user.click(
			await screen.findByRole("button", { name: "Ativar cena Modo Cinema" }),
		);

		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith('Cena "Modo Cinema" ativada'),
		);
		expect(activatedId).toBe("s1");
	});

	it("ScenesView_SceneWithoutDevices_ShouldBeFlaggedAndNotActivatable", async () => {
		mockScenes([createSceneMock({ id: "empty", name: "Vazia", items: [] })]);

		renderView();

		expect(await screen.findAllByText("Sem dispositivos")).not.toHaveLength(0);
		expect(
			screen.queryByRole("button", { name: "Ativar cena Vazia" }),
		).not.toBeInTheDocument();
	});

	it("ScenesView_SceneWithAnOfflineDevice_ShouldWarnOnItsRow", async () => {
		mockScenes([cinema, night]);

		renderView();
		await findRow("Boa Noite");

		expect(await screen.findByText("1 offline")).toBeInTheDocument();
	});

	it("ScenesView_SelectingARow_ShouldPutItsIdInTheUrlAndShowItInTheQuickEdit", async () => {
		mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");

		expect(within(quickPanel()).getByText("Modo Cinema")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Selecionar cena Boa Noite" }),
		);

		expect(screen.getByTestId("location")).toHaveTextContent(
			"/scenes?scene=s2",
		);
		expect(within(quickPanel()).getByText("Boa Noite")).toBeInTheDocument();
	});

	it("ScenesView_SceneInTheUrl_ShouldStartSelected", async () => {
		mockScenes([cinema, night]);

		renderView("/scenes?scene=s2");

		await findRow("Modo Cinema");
		expect(within(quickPanel()).getByText("Boa Noite")).toBeInTheDocument();
	});
});

describe("ScenesView · métricas", () => {
	const metricsPanel = () => screen.getByRole("region", { name: "Desempenho" });
	const TITLES = [
		"Ativações",
		"Taxa de sucesso",
		"Mais ativadas",
		"Horário de pico",
	];

	it("ScenesView_WithScenes_ShouldShowTheFourMetricCardsBelowTheQuickEdit", async () => {
		mockScenes([cinema, night]);

		renderView();
		await findRow("Modo Cinema");

		for (const title of TITLES) {
			expect(
				within(metricsPanel()).getByRole("region", { name: title }),
			).toBeInTheDocument();
		}
		expect(
			quickPanel().compareDocumentPosition(metricsPanel()) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("ScenesView_NoScenes_ShouldStillShowTheMetricCardsEachWithItsEmptyState", async () => {
		mockScenes([]);

		renderView();
		await screen.findByRole("button", {
			name: "Clique aqui para criar uma nova cena e ver as predefinições",
		});

		for (const title of TITLES) {
			expect(
				within(
					within(metricsPanel()).getByRole("region", { name: title }),
				).getByText("Ainda não há dados"),
			).toBeInTheDocument();
		}
	});
});

describe("ScenesView · busca, ambiente e visualização", () => {
	it("ScenesView_Search_ShouldFilterBySceneNameOrDeviceName", async () => {
		mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");

		await user.type(
			screen.getByLabelText("Buscar cena ou dispositivo"),
			"corredor",
		);

		expect(
			screen.getByRole("button", { name: "Selecionar cena Boa Noite" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Selecionar cena Modo Cinema" }),
		).not.toBeInTheDocument();

		await user.clear(screen.getByLabelText("Buscar cena ou dispositivo"));
		await user.type(screen.getByLabelText("Buscar cena ou dispositivo"), "zzz");
		expect(screen.getByText("Nenhuma cena encontrada.")).toBeInTheDocument();
	});

	it("ScenesView_RoomChips_ShouldListTheRoomsOfTheSceneDevicesAndFilter", async () => {
		mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");

		const rooms = await screen.findByRole("group", { name: "Ambiente" });
		await waitFor(() =>
			expect(
				within(rooms)
					.getAllByRole("button")
					.map((button) => button.textContent),
			).toEqual(["Todos", "Corredor", "Quarto", "Sala"]),
		);

		await user.click(within(rooms).getByRole("button", { name: "Sala" }));

		expect(
			screen.getByRole("button", { name: "Selecionar cena Modo Cinema" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Selecionar cena Boa Noite" }),
		).not.toBeInTheDocument();
	});

	it("ScenesView_CardsOption_ShouldSwitchTheViewAndKeepRowActions", async () => {
		mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");
		expect(screen.getByRole("list", { name: "Cenas" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Cards" }));

		expect(useScenesUIStore.getState().viewMode).toBe("cards");
		expect(
			screen.getByRole("button", { name: "Selecionar cena Modo Cinema" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Ativar cena Modo Cinema" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Lista" }));
		expect(useScenesUIStore.getState().viewMode).toBe("list");
	});
});

describe("ScenesView · sem cenas", () => {
	const GHOST_LABEL =
		"Clique aqui para criar uma nova cena e ver as predefinições";

	it("ScenesView_NoScenes_ShouldKeepTheSameLayoutWithAGhostButtonInTheList", async () => {
		mockScenes([]);

		renderView();

		expect(
			await screen.findByRole("button", { name: GHOST_LABEL }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Suas cenas" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Nova cena" }),
		).toBeInTheDocument();
	});

	it("ScenesView_NoScenes_ShouldShowTheQuickEditColumnEmptyInsteadOfListingPresets", async () => {
		mockScenes([]);

		renderView();
		await screen.findByRole("button", { name: GHOST_LABEL });

		expect(
			within(quickPanel()).getByText(
				"Suas cenas aparecem aqui. Crie a primeira para ajustá-la rápido.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Usar predefinição/ }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Crie sua primeira cena"),
		).not.toBeInTheDocument();
	});

	it("ScenesView_ClickingTheGhostButton_ShouldGoToTheCreationPage", async () => {
		mockScenes([]);
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByRole("button", { name: GHOST_LABEL }));

		expect(screen.getByTestId("location")).toHaveTextContent("/scenes/new");
	});

	it("ScenesView_NoScenes_ShouldNotShowTheSelectASceneHint", async () => {
		mockScenes([]);

		renderView();
		await screen.findByRole("button", { name: GHOST_LABEL });

		expect(
			screen.queryByText("Selecione uma cena para editar rápido"),
		).not.toBeInTheDocument();
	});

	it("ScenesView_NoScenes_ShouldNotShowRoomChips", async () => {
		mockScenes([]);

		renderView();
		await screen.findByRole("button", { name: GHOST_LABEL });

		expect(
			screen.queryByRole("group", { name: "Ambiente" }),
		).not.toBeInTheDocument();
	});
});

describe("ScenesView · edição rápida", () => {
	const lampScene = createSceneMock({
		id: "q1",
		name: "Cena Rápida",
		icon: "sun",
		items: [
			itemOf(lamp, { isOn: true, brightness: 40 }),
			itemOf(tv, { isOn: false }),
		],
	});

	function capturePut() {
		const calls: unknown[] = [];
		server.use(
			http.put("*/api/scenes/:id", async ({ request }) => {
				calls.push(await request.json());
				return new HttpResponse(null, { status: 204 });
			}),
		);
		return calls;
	}

	it("ScenesView_QuickEdit_ShouldListTheSceneDevicesWithTheirStates", async () => {
		mockScenes([lampScene]);

		renderView();
		await findRow("Cena Rápida");

		const panel = quickPanel();
		expect(within(panel).getByText("Luz da Sala")).toBeInTheDocument();
		expect(within(panel).getByText("Smart-TV-Pro")).toBeInTheDocument();
		expect(
			within(panel).getByRole("switch", { name: "Ligar Luz da Sala" }),
		).toBeChecked();
		expect(
			within(panel).getByRole("switch", { name: "Ligar Smart-TV-Pro" }),
		).not.toBeChecked();
	});

	it("ScenesView_QuickEditWithoutChanges_ShouldNotOfferToSave", async () => {
		mockScenes([lampScene]);
		renderView();
		await findRow("Cena Rápida");

		expect(
			within(quickPanel()).queryByRole("button", { name: "Salvar alterações" }),
		).not.toBeInTheDocument();
	});

	it("ScenesView_TogglingADeviceInTheQuickEdit_ShouldOfferToSaveAndPutTheNewState", async () => {
		mockScenes([lampScene]);
		const calls = capturePut();
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");

		await user.click(
			await within(quickPanel()).findByRole("switch", {
				name: "Ligar Smart-TV-Pro",
			}),
		);
		await user.click(
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		);

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]).toEqual({
			name: "Cena Rápida",
			icon: "sun",
			items: [
				{
					deviceId: "lamp",
					isOn: true,
					brightness: 40,
					colorHex: null,
					colorTempPercent: null,
				},
				{
					deviceId: "tv",
					isOn: true,
					brightness: null,
					colorHex: null,
					colorTempPercent: null,
				},
			],
		});
	});

	it("ScenesView_AdjustingBrightnessInTheQuickEdit_ShouldSaveTheNewValue", async () => {
		mockScenes([lampScene]);
		const calls = capturePut();
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");

		const group = await within(quickPanel()).findByRole("group", {
			name: "Brilho de Luz da Sala",
		});
		const thumb = within(group).getByRole("slider");
		thumb.focus();
		fireEvent.keyDown(thumb, { key: "ArrowLeft" });

		expect(within(group).getByText("39%")).toBeInTheDocument();
		await user.click(
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		);

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]).toMatchObject({
			items: [
				{ deviceId: "lamp", isOn: true, brightness: 39 },
				expect.anything(),
			],
		});
	});

	it("ScenesView_DiscardingQuickEditChanges_ShouldRestoreTheSavedState", async () => {
		mockScenes([lampScene]);
		const calls = capturePut();
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");
		const tvSwitch = await within(quickPanel()).findByRole("switch", {
			name: "Ligar Smart-TV-Pro",
		});

		await user.click(tvSwitch);
		expect(tvSwitch).toBeChecked();
		await user.click(
			within(quickPanel()).getByRole("button", { name: "Descartar" }),
		);

		expect(
			within(quickPanel()).getByRole("switch", { name: "Ligar Smart-TV-Pro" }),
		).not.toBeChecked();
		expect(
			within(quickPanel()).queryByRole("button", { name: "Salvar alterações" }),
		).not.toBeInTheDocument();
		expect(calls).toHaveLength(0);
	});

	it("ScenesView_OpenEditor_ShouldGoToTheEditPageOfTheSelectedScene", async () => {
		mockScenes([lampScene]);
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");

		await user.click(
			within(quickPanel()).getByRole("button", { name: "Abrir editor" }),
		);

		expect(screen.getByTestId("location")).toHaveTextContent("/scenes/q1/edit");
	});

	it("ScenesView_QuickEditOfAnEmptyScene_ShouldOfferToAddDevices", async () => {
		mockScenes([createSceneMock({ id: "e1", name: "Vazia", items: [] })]);
		const user = userEvent.setup();
		renderView();
		await findRow("Vazia");

		expect(
			within(quickPanel()).getByText("Esta cena não tem dispositivos."),
		).toBeInTheDocument();
		await user.click(
			within(quickPanel()).getByRole("button", {
				name: "Adicionar dispositivos",
			}),
		);

		expect(screen.getByTestId("location")).toHaveTextContent("/scenes/e1/edit");
	});

	it("ScenesView_DeleteConfirmed_ShouldCallTheApi", async () => {
		mockScenes([lampScene]);
		let deletedId: string | undefined;
		server.use(
			http.delete("*/api/scenes/:id", ({ params }) => {
				deletedId = String(params.id);
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");

		await user.click(
			within(quickPanel()).getByRole("button", { name: "Excluir cena" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		await waitFor(() => expect(deletedId).toBe("q1"));
	});

	it("ScenesView_DeleteCancelled_ShouldNotCallTheApi", async () => {
		mockScenes([lampScene]);
		let deleteCalled = false;
		server.use(
			http.delete("*/api/scenes/:id", () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");

		await user.click(
			within(quickPanel()).getByRole("button", { name: "Excluir cena" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

		await waitFor(() =>
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
		);
		expect(deleteCalled).toBe(false);
	});
});

describe("ScenesView · erro", () => {
	it("ScenesView_ListFails_ShouldShowTheErrorFallbackAndRetry", async () => {
		let calls = 0;
		server.use(
			http.get("*/api/scenes", () => {
				calls += 1;
				return calls <= 2
					? HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 })
					: HttpResponse.json({ items: [cinema] });
			}),
		);
		const user = userEvent.setup();
		renderView();

		const alert = await screen.findByRole("alert", undefined, {
			timeout: 4000,
		});
		expect(alert).toHaveTextContent("Não foi possível carregar as cenas.");

		await user.click(
			within(alert).getByRole("button", { name: "Tentar novamente" }),
		);

		expect(await findRow("Modo Cinema")).toBeInTheDocument();
	});
});
