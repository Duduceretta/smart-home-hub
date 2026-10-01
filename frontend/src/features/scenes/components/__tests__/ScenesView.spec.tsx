import { HttpResponse, http } from "msw";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScenesUIStore } from "@/features/scenes/store/scenes-ui.store";
import {
	createSceneActivationResultMock,
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
import { ScenesView } from "../ScenesView";

function mockScenes(scenes: unknown[]) {
	server.use(
		http.get("*/api/scenes", () => HttpResponse.json({ items: scenes })),
	);
}

beforeEach(() => {
	vi.restoreAllMocks();
	useScenesUIStore.setState({
		isEditorOpen: false,
		editingScene: null,
		seed: null,
	});
	// O editor (NH-53) busca dispositivos ao abrir; aqui só interessa o estado da store.
	server.use(http.get("*/api/devices", () => HttpResponse.json({ items: [] })));
});

describe("ScenesView", () => {
	it("ScenesView_ScenesStillLoading_ShouldRenderTheLoadingSkeleton", () => {
		server.use(http.get("*/api/scenes", () => new Promise(() => {})));

		renderWithProviders(<ScenesView />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("ScenesView_WithScenes_ShouldShowEachCardWithDeviceCountAndLastActivation", async () => {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		mockScenes([
			createSceneMock({
				id: "s1",
				name: "Modo Cinema",
				lastActivatedAt: twoHoursAgo,
			}),
			createSceneMock({
				id: "s2",
				name: "Boa Noite",
				icon: "moon",
				lastActivatedAt: null,
				items: [createSceneItemMock({ isOn: false })],
			}),
		]);

		renderWithProviders(<ScenesView />);

		expect(await screen.findByText("Modo Cinema")).toBeInTheDocument();
		expect(screen.getByText("Boa Noite")).toBeInTheDocument();
		expect(screen.getByText("2 dispositivos")).toBeInTheDocument();
		expect(screen.getByText("1 dispositivo")).toBeInTheDocument();
		expect(screen.getByText("Ativada há 2 horas")).toBeInTheDocument();
		expect(screen.getByText("Nunca ativada")).toBeInTheDocument();
	});

	it("ScenesView_NoScenes_ShouldOfferTheFourSuggestions", async () => {
		mockScenes([]);

		renderWithProviders(<ScenesView />);

		expect(
			await screen.findByText("Crie sua primeira cena"),
		).toBeInTheDocument();
		for (const name of [
			"Bom Dia",
			"Chegar em Casa",
			"Sair de Casa",
			"Boa Noite",
		]) {
			expect(
				screen.getByRole("button", { name: `Usar sugestão ${name}` }),
			).toBeInTheDocument();
		}
	});

	it("ScenesView_ClickingASuggestion_ShouldOpenTheEditorPrefilledWithItsNameAndIcon", async () => {
		mockScenes([]);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		await user.click(
			await screen.findByRole("button", { name: "Usar sugestão Boa Noite" }),
		);

		expect(useScenesUIStore.getState()).toMatchObject({
			isEditorOpen: true,
			editingScene: null,
			seed: { name: "Boa Noite", icon: "moon" },
		});
	});

	it("ScenesView_StartFromScratchOnTheEmptyState_ShouldOpenAnEmptyEditor", async () => {
		mockScenes([]);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		await user.click(
			await screen.findByRole("button", { name: "Começar do zero" }),
		);

		expect(useScenesUIStore.getState()).toMatchObject({
			isEditorOpen: true,
			editingScene: null,
			seed: null,
		});
	});

	it("ScenesView_NewSceneButton_ShouldOpenTheEditorInCreateMode", async () => {
		mockScenes([createSceneMock()]);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);
		await screen.findByText("Modo Cinema");

		await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);

		expect(useScenesUIStore.getState()).toMatchObject({
			isEditorOpen: true,
			editingScene: null,
		});
	});

	it("ScenesView_ActivatingACard_ShouldCallTheApiAndToastTheOutcome", async () => {
		const toastSuccess = vi.spyOn(toast, "success");
		let activatedId: string | undefined;
		mockScenes([createSceneMock({ id: "s1", name: "Modo Cinema" })]);
		server.use(
			http.post("*/api/scenes/:id/activate", ({ params }) => {
				activatedId = String(params.id);
				return HttpResponse.json(createSceneActivationResultMock());
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		await user.click(
			await screen.findByRole("button", { name: "Ativar cena Modo Cinema" }),
		);

		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith('Cena "Modo Cinema" ativada'),
		);
		expect(activatedId).toBe("s1");
	});

	it("ScenesView_SceneWithoutDevices_ShouldFlagItAndOfferToAddDevicesInsteadOfActivating", async () => {
		mockScenes([createSceneMock({ id: "empty", name: "Vazia", items: [] })]);
		let activateCalled = false;
		server.use(
			http.post("*/api/scenes/:id/activate", () => {
				activateCalled = true;
				return HttpResponse.json(createSceneActivationResultMock());
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		expect(await screen.findByText("Sem dispositivos")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Ativar cena Vazia" }),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Adicionar dispositivos" }),
		);

		expect(activateCalled).toBe(false);
		expect(useScenesUIStore.getState().editingScene?.id).toBe("empty");
	});

	it("ScenesView_EditFromTheCardMenu_ShouldOpenTheEditorOnThatScene", async () => {
		const scene = createSceneMock({ id: "s1", name: "Modo Cinema" });
		mockScenes([scene]);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		await user.click(
			await screen.findByRole("button", { name: "Opções da cena Modo Cinema" }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

		expect(useScenesUIStore.getState()).toMatchObject({
			isEditorOpen: true,
			editingScene: scene,
		});
	});

	it("ScenesView_DeleteConfirmed_ShouldCallTheApi", async () => {
		mockScenes([createSceneMock({ id: "s1", name: "Modo Cinema" })]);
		let deletedId: string | undefined;
		server.use(
			http.delete("*/api/scenes/:id", ({ params }) => {
				deletedId = String(params.id);
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		await user.click(
			await screen.findByRole("button", { name: "Opções da cena Modo Cinema" }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		await waitFor(() => expect(deletedId).toBe("s1"));
	});

	it("ScenesView_DeleteCancelled_ShouldNotCallTheApi", async () => {
		mockScenes([createSceneMock({ id: "s1", name: "Modo Cinema" })]);
		let deleteCalled = false;
		server.use(
			http.delete("*/api/scenes/:id", () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		await user.click(
			await screen.findByRole("button", { name: "Opções da cena Modo Cinema" }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

		await waitFor(() =>
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
		);
		expect(deleteCalled).toBe(false);
	});

	it("ScenesView_ListFails_ShouldShowTheErrorFallbackAndRetry", async () => {
		let calls = 0;
		server.use(
			http.get("*/api/scenes", () => {
				calls += 1;
				return calls <= 2
					? HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 })
					: HttpResponse.json({ items: [createSceneMock()] });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<ScenesView />);

		const alert = await screen.findByRole("alert", undefined, {
			timeout: 4000,
		});
		expect(alert).toHaveTextContent("Não foi possível carregar as cenas.");

		await user.click(
			within(alert).getByRole("button", { name: "Tentar novamente" }),
		);

		expect(await screen.findByText("Modo Cinema")).toBeInTheDocument();
	});
});
