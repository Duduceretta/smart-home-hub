import { onlineManager } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { MemoryRouter, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScenesUIStore } from "@/features/scenes/store/scenes-ui.store";
import type { Scene, SceneMetrics } from "@/features/scenes/types/scenes.types";
import { mockScenesApi } from "@/testing/mocks/scenes-api.mock";
import {
	createSceneActivationResultMock,
	createSceneDeviceMock,
	createSceneItemMock,
	createSceneMock,
	createSceneStatsMock,
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

// Servidor de mentira fiel ao contrato real (paginação, search e room no servidor).
function mockScenes(scenes: Scene[], stats?: SceneMetrics) {
	return mockScenesApi(scenes, DEVICES, stats);
}

// Várias cenas, para exercitar a paginação (nomes em ordem alfabética estável).
function manyScenes(count: number): Scene[] {
	return Array.from({ length: count }, (_, index) =>
		createSceneMock({
			id: `many-${String(index + 1).padStart(2, "0")}`,
			name: `Cena ${String(index + 1).padStart(2, "0")}`,
			items: [itemOf(lamp, { isOn: true })],
		}),
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
		server.use(
			http.get("*/api/scenes/rooms", () => HttpResponse.json([])),
			http.get("*/api/scenes/stats", () => new Promise(() => {})),
			http.get("*/api/scenes", () => new Promise(() => {})),
		);

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

		// Sem seleção na URL, vale a primeira da página (o servidor ordena por nome).
		expect(within(quickPanel()).getByText("Boa Noite")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Selecionar cena Modo Cinema" }),
		);

		expect(screen.getByTestId("location")).toHaveTextContent(
			"/scenes?scene=s1",
		);
		expect(within(quickPanel()).getByText("Modo Cinema")).toBeInTheDocument();
	});

	it("ScenesView_SceneInTheUrl_ShouldStartSelected", async () => {
		mockScenes([cinema, night]);

		renderView("/scenes?scene=s2");

		await findRow("Modo Cinema");
		expect(within(quickPanel()).getByText("Boa Noite")).toBeInTheDocument();
	});
});

describe("ScenesView · métricas", () => {
	it("ScenesView_StatsFromTheServer_ShouldFillTheMetricCards", async () => {
		mockScenes(
			[cinema, night],
			createSceneStatsMock({
				activationsTotal: 12,
				previousActivationsTotal: 10,
				successRate: 91.7,
				peakHour: "20:00",
				topScenes: [
					{ sceneId: "s1", name: "Modo Cinema", activations: 7 },
					{ sceneId: "s2", name: "Boa Noite", activations: 5 },
				],
			}),
		);
		renderView();
		await findRow("Modo Cinema");

		const panel = screen.getByRole("region", { name: "Desempenho" });
		const card = (name: string) => within(panel).getByRole("region", { name });

		expect(
			await within(card("Ativações")).findByText("12"),
		).toBeInTheDocument();
		expect(
			within(card("Ativações")).getByText("+20% vs. semana anterior"),
		).toBeInTheDocument();
		expect(
			within(card("Taxa de sucesso")).getByText("91.7%"),
		).toBeInTheDocument();
		expect(
			within(card("Horário de pico")).getByText("20:00"),
		).toBeInTheDocument();
		expect(
			within(card("Mais ativadas")).getByText("Modo Cinema"),
		).toBeInTheDocument();
	});

	it("ScenesView_Stats_ShouldAskForTheBrowserTimeZone", async () => {
		const { statsRequests } = mockScenes([cinema]);
		renderView();
		await findRow("Modo Cinema");

		await waitFor(() => expect(statsRequests.length).toBeGreaterThan(0));
		expect(statsRequests[0]?.searchParams.get("timeZone")).toBe(
			Intl.DateTimeFormat().resolvedOptions().timeZone,
		);
	});

	it("ScenesView_StatsRequestFails_ShouldShowAnErrorNotAnEmptyStateAndRetry", async () => {
		const stats = createSceneStatsMock({ activationsTotal: 12 });
		mockScenes([cinema]);
		let calls = 0;
		server.use(
			http.get("*/api/scenes/stats", () => {
				calls += 1;
				return calls <= 2
					? HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 })
					: HttpResponse.json(stats);
			}),
		);
		const user = userEvent.setup();
		renderView();

		// A lista funciona mesmo com as métricas fora do ar.
		expect(await findRow("Modo Cinema")).toBeInTheDocument();
		const panel = screen.getByRole("region", { name: "Desempenho" });
		const alert = await within(panel).findByRole("alert", undefined, {
			timeout: 4000,
		});
		expect(alert).toHaveTextContent("Não foi possível carregar as métricas.");

		await user.click(
			within(alert).getByRole("button", { name: "Tentar novamente" }),
		);

		expect(
			await within(
				within(panel).getByRole("region", { name: "Ativações" }),
			).findByText("12"),
		).toBeInTheDocument();
		expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
	});

	it("ScenesView_StatsStillLoading_ShouldNotShowAnError", async () => {
		mockScenes([cinema]);
		server.use(http.get("*/api/scenes/stats", () => new Promise(() => {})));
		renderView();

		await findRow("Modo Cinema");

		expect(
			within(screen.getByRole("region", { name: "Desempenho" })).queryByRole(
				"alert",
			),
		).not.toBeInTheDocument();
	});

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

		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Selecionar cena Modo Cinema" }),
			).not.toBeInTheDocument(),
		);
		expect(
			screen.getByRole("button", { name: "Selecionar cena Boa Noite" }),
		).toBeInTheDocument();

		await user.clear(screen.getByLabelText("Buscar cena ou dispositivo"));
		await user.type(screen.getByLabelText("Buscar cena ou dispositivo"), "zzz");
		expect(
			await screen.findByText("Nenhuma cena encontrada."),
		).toBeInTheDocument();
	});

	it("ScenesView_RoomChips_ShouldListTheRoomsOfTheSceneDevicesAndFilter", async () => {
		mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");

		const rooms = await screen.findByRole("group", { name: "Ambientes" });
		await waitFor(() =>
			expect(
				within(rooms)
					.getAllByRole("button")
					.map((button) => button.textContent),
			).toEqual(["Todas as cenas", "Corredor", "Quarto", "Sala"]),
		);

		await user.click(within(rooms).getByRole("button", { name: "Sala" }));

		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Selecionar cena Boa Noite" }),
			).not.toBeInTheDocument(),
		);
		expect(
			screen.getByRole("button", { name: "Selecionar cena Modo Cinema" }),
		).toBeInTheDocument();
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
			screen.getByRole("heading", { name: "Painel operacional de cenas" }),
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
			screen.queryByRole("group", { name: "Ambientes" }),
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

	it("ScenesView_QuickEditWithoutChanges_ShouldShowSaveAndDiscardDisabled", async () => {
		mockScenes([lampScene]);
		renderView();
		await findRow("Cena Rápida");

		expect(
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		).toBeDisabled();
		expect(
			within(quickPanel()).getByRole("button", { name: "Descartar" }),
		).toBeDisabled();
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
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		).toBeDisabled();
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

describe("ScenesView · paginação, busca e ambiente no servidor", () => {
	const pager = () =>
		screen.getByRole("navigation", { name: "Paginação das cenas" });
	const lastRequest = (requests: URL[]) => requests[requests.length - 1];

	it("ScenesView_ManyScenes_ShouldAskTheServerForTheFirstPageOnly", async () => {
		const { requests } = mockScenes(manyScenes(27));

		renderView();

		expect(await findRow("Cena 01")).toBeInTheDocument();
		expect(await findRow("Cena 11")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Selecionar cena Cena 12" }),
		).not.toBeInTheDocument();
		expect(requests[0]?.searchParams.get("page")).toBe("1");
		expect(requests[0]?.searchParams.get("pageSize")).toBe("11");
		expect(pager()).toHaveTextContent("Mostrando 1–11 de 27 cenas");
		expect(screen.getByText("27 cenas")).toBeInTheDocument();
	});

	it("ScenesView_SingleScene_ShouldUseTheSingularInThePagerSummary", async () => {
		mockScenes([cinema]);

		renderView();

		await findRow("Modo Cinema");
		expect(pager()).toHaveTextContent("Mostrando 1–1 de 1 cena");
		expect(pager()).not.toHaveTextContent("1 cenas");
	});

	it("ScenesView_NextPage_ShouldRequestItAndPutItInTheUrl", async () => {
		const { requests } = mockScenes(manyScenes(27));
		const user = userEvent.setup();
		renderView();
		await findRow("Cena 01");

		await user.click(
			within(pager()).getByRole("button", { name: "Próxima página" }),
		);

		expect(await findRow("Cena 12")).toBeInTheDocument();
		expect(lastRequest(requests)?.searchParams.get("page")).toBe("2");
		expect(screen.getByTestId("location")).toHaveTextContent("page=2");
		expect(pager()).toHaveTextContent("Mostrando 12–22 de 27 cenas");
	});

	it("ScenesView_PageInTheUrl_ShouldStartOnThatPage", async () => {
		mockScenes(manyScenes(27));

		renderView("/scenes?page=3");

		expect(await findRow("Cena 23")).toBeInTheDocument();
		expect(pager()).toHaveTextContent("Mostrando 23–27 de 27 cenas");
	});

	it("ScenesView_PageBeyondTheLastOne_ShouldFallBackToTheLastPage", async () => {
		mockScenes(manyScenes(27));

		renderView("/scenes?page=9");

		expect(await findRow("Cena 23")).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByTestId("location")).toHaveTextContent("page=3"),
		);
	});

	it("ScenesView_CardsView_ShouldUseASmallerPageSize", async () => {
		useScenesUIStore.setState({ viewMode: "cards" });
		const { requests } = mockScenes(manyScenes(27));

		renderView();

		expect(await findRow("Cena 10")).toBeInTheDocument();
		expect(requests[0]?.searchParams.get("pageSize")).toBe("10");
		expect(
			screen.queryByRole("button", { name: "Selecionar cena Cena 11" }),
		).not.toBeInTheDocument();
	});

	it("ScenesView_TypingASearch_ShouldSendOneDebouncedRequestAndBackToFirstPage", async () => {
		const { requests } = mockScenes(manyScenes(27));
		const user = userEvent.setup();
		renderView("/scenes?page=2");
		await findRow("Cena 12");
		const before = requests.length;

		await user.type(
			screen.getByLabelText("Buscar cena ou dispositivo"),
			"cena 2",
		);

		await waitFor(() =>
			expect(lastRequest(requests)?.searchParams.get("search")).toBe("cena 2"),
		);
		expect(lastRequest(requests)?.searchParams.get("page")).toBe("1");
		// Sete teclas, uma única requisição: a busca espera o usuário parar de digitar.
		expect(requests.length - before).toBe(1);
		expect(screen.getByTestId("location")).toHaveTextContent("q=cena+2");
		expect(screen.getByTestId("location")).not.toHaveTextContent("page=");
	});

	it("ScenesView_SearchInTheUrl_ShouldFillTheFieldAndFilterOnTheServer", async () => {
		const { requests } = mockScenes(manyScenes(27));

		renderView("/scenes?q=cena+27");

		expect(await findRow("Cena 27")).toBeInTheDocument();
		expect(screen.getByLabelText("Buscar cena ou dispositivo")).toHaveValue(
			"cena 27",
		);
		expect(requests[0]?.searchParams.get("search")).toBe("cena 27");
	});

	it("ScenesView_RoomFilter_ShouldSendTheRoomToTheServerAndKeepAllChips", async () => {
		const { requests } = mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");
		const rooms = await screen.findByRole("group", { name: "Ambientes" });
		await waitFor(() =>
			expect(within(rooms).getAllByRole("button")).toHaveLength(4),
		);

		await user.click(within(rooms).getByRole("button", { name: "Quarto" }));

		await waitFor(() =>
			expect(lastRequest(requests)?.searchParams.get("room")).toBe("Quarto"),
		);
		expect(await findRow("Boa Noite")).toBeInTheDocument();
		// As pílulas vêm do endpoint de ambientes: filtrar não faz as outras sumirem.
		expect(within(rooms).getAllByRole("button")).toHaveLength(4);
		expect(
			within(rooms).getByRole("button", { name: "Quarto" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("ScenesView_SelectedSceneOutsideTheCurrentPage_ShouldBeFetchedByIdForTheQuickEdit", async () => {
		mockScenes(manyScenes(27));

		renderView("/scenes?scene=many-20");

		await findRow("Cena 01");
		expect(
			await within(quickPanel()).findByText("Cena 20"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Selecionar cena Cena 20" }),
		).not.toBeInTheDocument();
	});

	it("ScenesView_SelectedSceneThatNoLongerExists_ShouldFallBackToTheFirstOnThePage", async () => {
		mockScenes(manyScenes(5));

		renderView("/scenes?scene=deleted-scene");

		await findRow("Cena 01");
		expect(
			await within(quickPanel()).findByText("Cena 01"),
		).toBeInTheDocument();
	});

	it("ScenesView_FilteredWithNoResult_ShouldShowTheMessageAndKeepTheChips", async () => {
		mockScenes([cinema, night]);
		const user = userEvent.setup();
		renderView();
		await findRow("Modo Cinema");

		await user.type(screen.getByLabelText("Buscar cena ou dispositivo"), "zzz");

		expect(
			await screen.findByText("Nenhuma cena encontrada."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("group", { name: "Ambientes" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", {
				name: "Clique aqui para criar uma nova cena e ver as predefinições",
			}),
		).not.toBeInTheDocument();
	});
});

describe("ScenesView · edição rápida: slots fixos, vazios e troca de cena", () => {
	// A edição rápida tem sempre 3 slots (um por dispositivo) para o cartão não mudar de
	// altura de uma cena para outra; o primeiro slot livre vira o botão "Adicionar".
	const slotList = () => quickPanel().querySelector("ul") as HTMLUListElement;
	const slotCount = () => slotList().children.length;
	const sceneOf = (id: string, name: string, devices: (typeof lamp)[]) =>
		createSceneMock({
			id,
			name,
			items: devices.map((device) => itemOf(device, { isOn: true })),
		});
	const addDeviceButton = () =>
		within(quickPanel()).queryByRole("button", {
			name: /^Adicionar dispositivo/,
		});

	it("ScenesView_QuickEditWithOneDevice_ShouldKeepThreeSlotsWithAGhostInTheFirstFreeOne", async () => {
		mockScenes([sceneOf("s-one", "Uma só", [lamp])]);
		renderView();
		await findRow("Uma só");

		expect(slotCount()).toBe(3);
		expect(addDeviceButton()).toBeInTheDocument();
		// 1 slot com dispositivo + 1 com o botão + 1 vazio e escondido de leitor de tela
		expect(
			slotList().querySelectorAll(':scope > li[aria-hidden="true"]'),
		).toHaveLength(1);
		expect(
			within(quickPanel()).getAllByRole("button", {
				name: /^Adicionar dispositivo/,
			}),
		).toHaveLength(1);
	});

	it("ScenesView_QuickEditWithTwoDevices_ShouldKeepThreeSlotsWithAGhostInTheLastOne", async () => {
		mockScenes([sceneOf("s-two", "Duas", [lamp, tv])]);
		renderView();
		await findRow("Duas");

		expect(slotCount()).toBe(3);
		expect(addDeviceButton()).toBeInTheDocument();
		expect(
			slotList().querySelectorAll(':scope > li[aria-hidden="true"]'),
		).toHaveLength(0);
	});

	it("ScenesView_QuickEditWithThreeDevices_ShouldFillTheSlotsWithoutGhost", async () => {
		mockScenes([sceneOf("s-three", "Três", [lamp, tv, bedLamp])]);
		renderView();
		await findRow("Três");

		expect(slotCount()).toBe(3);
		expect(addDeviceButton()).not.toBeInTheDocument();
	});

	it("ScenesView_QuickEditWithMoreThanThreeDevices_ShouldShowOnlyTheFirstThree", async () => {
		mockScenes([sceneOf("s-four", "Quatro", [lamp, tv, bedLamp, hallLamp])]);
		renderView();
		await findRow("Quatro");

		expect(slotCount()).toBe(3);
		expect(within(quickPanel()).getByText("Luz do Quarto")).toBeInTheDocument();
		expect(
			within(quickPanel()).queryByText("Lâmpada do Corredor"),
		).not.toBeInTheDocument();
		expect(addDeviceButton()).not.toBeInTheDocument();
	});

	it("ScenesView_GhostAddDeviceButton_ShouldOpenTheSceneEditor", async () => {
		mockScenes([sceneOf("s-one", "Uma só", [lamp])]);
		const user = userEvent.setup();
		renderView();
		await findRow("Uma só");

		await user.click(addDeviceButton() as HTMLElement);

		expect(screen.getByTestId("location")).toHaveTextContent(
			"/scenes/s-one/edit",
		);
	});

	it("ScenesView_QuickEditHeader_ShouldPutTitleAndSceneNameOnTheSameLine", async () => {
		mockScenes([sceneOf("s-one", "Uma só", [lamp])]);
		renderView();
		await findRow("Uma só");

		const header = quickPanel().querySelector("header") as HTMLElement;
		expect(header).toHaveTextContent(/Edição rápida\s*·\s*Uma só/);
	});

	it("ScenesView_QuickEditSlot_ShouldShowDeviceAndRoomSideBySideAndTheOfflineFlag", async () => {
		mockScenes([sceneOf("s-rooms", "Ambientes", [lamp, hallLamp])]);
		renderView();
		await findRow("Ambientes");

		expect(within(quickPanel()).getByText("· Sala")).toBeInTheDocument();
		expect(
			within(quickPanel()).getByText("· Corredor · offline"),
		).toBeInTheDocument();
	});

	it("ScenesView_BrightnessInTheQuickEdit_ShouldOpenWhenTheDeviceTurnsOnAndCloseWhenItTurnsOff", async () => {
		mockScenes([
			createSceneMock({
				id: "s-bright",
				name: "Luzes",
				items: [
					itemOf(bedLamp, { isOn: false, brightness: 30 }),
					itemOf(hallLamp, { isOn: true }),
				],
			}),
		]);
		const user = userEvent.setup();
		renderView();
		await findRow("Luzes");
		const brightness = () =>
			within(quickPanel()).queryByRole("group", {
				name: "Brilho de Luz do Quarto",
			});

		// desligada: o brilho está fechado (escondido de leitor de tela, sem foco)
		expect(brightness()).not.toBeInTheDocument();

		await user.click(
			within(quickPanel()).getByRole("switch", { name: "Ligar Luz do Quarto" }),
		);
		expect(brightness()).toBeInTheDocument();

		await user.click(
			within(quickPanel()).getByRole("switch", { name: "Ligar Luz do Quarto" }),
		);
		expect(brightness()).not.toBeInTheDocument();

		// dispositivo sem controle de brilho (MQTT) nunca abre, mesmo ligado
		expect(
			within(quickPanel()).queryByRole("group", {
				name: "Brilho de Lâmpada do Corredor",
			}),
		).not.toBeInTheDocument();
	});

	it("ScenesView_SwitchingScene_ShouldDropTheUnsavedChangesOfThePreviousOne", async () => {
		const first = createSceneMock({
			id: "q2",
			name: "Aaa Outra",
			items: [itemOf(bedLamp, { isOn: false })],
		});
		mockScenes([
			first,
			createSceneMock({
				id: "q1",
				name: "Cena Rápida",
				items: [itemOf(lamp, { isOn: true }), itemOf(tv, { isOn: false })],
			}),
		]);
		const user = userEvent.setup();
		renderView();
		await findRow("Cena Rápida");

		// a primeira da página (por nome) vem selecionada
		expect(within(quickPanel()).getByText("Aaa Outra")).toBeInTheDocument();

		await user.click(await findRow("Cena Rápida"));
		await user.click(
			within(quickPanel()).getByRole("switch", { name: "Ligar Smart-TV-Pro" }),
		);
		expect(
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		).toBeEnabled();

		await user.click(await findRow("Aaa Outra"));
		expect(within(quickPanel()).getByText("Aaa Outra")).toBeInTheDocument();
		expect(
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		).toBeDisabled();

		await user.click(await findRow("Cena Rápida"));
		expect(
			within(quickPanel()).getByRole("switch", { name: "Ligar Smart-TV-Pro" }),
		).not.toBeChecked();
		expect(
			within(quickPanel()).getByRole("button", { name: "Salvar alterações" }),
		).toBeDisabled();
	});

	it("ScenesView_QuickEditContent_ShouldEnterWithAMotionSafeFade", async () => {
		mockScenes([sceneOf("s-one", "Uma só", [lamp])]);
		renderView();
		await findRow("Uma só");

		// Só o conteúdo anima na troca de cena (a moldura do cartão fica parada), e só para
		// quem não pediu movimento reduzido.
		expect(slotList().className).toContain("motion-safe:animate-in");
		expect(slotList().className).toContain("motion-safe:fade-in");
		expect(quickPanel().className).not.toContain("animate-in");
	});
});

describe("ScenesView · consulta pausada (rede ou foco)", () => {
	// Com o navegador "offline" (ou a janela sem foco) o React Query PAUSA a consulta depois
	// da falha: ela não está carregando, não está em erro e não tem dados. A tela não pode
	// tratar isso como "você não tem cenas".
	afterEach(() => onlineManager.setOnline(true));

	it("ScenesView_QueriesPausedBeforeAnyData_ShouldShowTheLoadErrorNotTheEmptyList", async () => {
		mockScenes([cinema]);
		onlineManager.setOnline(false);
		const user = userEvent.setup();
		renderView();

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Não foi possível carregar as cenas.");
		expect(
			screen.queryByRole("button", {
				name: "Clique aqui para criar uma nova cena e ver as predefinições",
			}),
		).not.toBeInTheDocument();

		onlineManager.setOnline(true);
		await user.click(
			within(alert).getByRole("button", { name: "Tentar novamente" }),
		);

		expect(await findRow("Modo Cinema")).toBeInTheDocument();
	});
});

describe("ScenesView · erro", () => {
	it("ScenesView_ListFails_ShouldShowTheErrorFallbackAndRetry", async () => {
		let calls = 0;
		server.use(
			http.get("*/api/scenes/rooms", () => HttpResponse.json([])),
			http.get("*/api/scenes/stats", () => new Promise(() => {})),
			http.get("*/api/scenes", () => {
				calls += 1;
				return calls <= 2
					? HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 })
					: HttpResponse.json({
							items: [cinema],
							page: 1,
							pageSize: 11,
							totalCount: 1,
							totalPages: 1,
							hasNextPage: false,
							hasPreviousPage: false,
						});
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
