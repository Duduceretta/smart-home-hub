import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
	createSceneActivationResultMock,
	createSceneDeviceMock,
	createSceneMock,
} from "@/testing/mocks/scenes.mock";
import { server } from "@/testing/mocks/server";
import {
	activateSceneRequest,
	createSceneRequest,
	deleteSceneRequest,
	fetchScene,
	fetchSceneDevices,
	fetchSceneRooms,
	fetchScenes,
	updateSceneRequest,
} from "../scenes.api";

describe("scenes.api", () => {
	describe("fetchScenes", () => {
		const pagedResponse = (scenes: unknown[], overrides = {}) => ({
			items: scenes,
			page: 1,
			pageSize: 10,
			totalCount: scenes.length,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
			...overrides,
		});

		it("fetchScenes_PagedResponse_ShouldReturnThePageWithItsTotals", async () => {
			const scene = createSceneMock();
			server.use(
				http.get("*/api/scenes", () =>
					HttpResponse.json(
						pagedResponse([scene], { totalCount: 27, totalPages: 3 }),
					),
				),
			);

			const page = await fetchScenes({ page: 1, pageSize: 10 });

			expect(page.items).toEqual([scene]);
			expect(page.totalCount).toBe(27);
			expect(page.totalPages).toBe(3);
		});

		it("fetchScenes_WithFilters_ShouldSendPageSearchAndRoom", async () => {
			const received: { params: URLSearchParams | null } = { params: null };
			server.use(
				http.get("*/api/scenes", ({ request }) => {
					received.params = new URL(request.url).searchParams;
					return HttpResponse.json(pagedResponse([]));
				}),
			);

			await fetchScenes({
				page: 2,
				pageSize: 11,
				search: "luz",
				room: "Sala",
			});

			expect(received.params?.get("page")).toBe("2");
			expect(received.params?.get("pageSize")).toBe("11");
			expect(received.params?.get("search")).toBe("luz");
			expect(received.params?.get("room")).toBe("Sala");
		});

		it("fetchScenes_BlankFilters_ShouldNotSendThem", async () => {
			const received: { params: URLSearchParams | null } = { params: null };
			server.use(
				http.get("*/api/scenes", ({ request }) => {
					received.params = new URL(request.url).searchParams;
					return HttpResponse.json(pagedResponse([]));
				}),
			);

			await fetchScenes({ page: 1, pageSize: 10, search: "  ", room: null });

			expect(received.params?.has("search")).toBe(false);
			expect(received.params?.has("room")).toBe(false);
		});

		it("fetchScenes_ServerError_ShouldThrowAppErrorWithFallbackMessage", async () => {
			server.use(
				http.get("*/api/scenes", () =>
					HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 }),
				),
			);

			await expect(fetchScenes({ page: 1, pageSize: 10 })).rejects.toThrow();
		});
	});

	describe("fetchSceneRooms", () => {
		it("fetchSceneRooms_ApiReturnsNames_ShouldReturnThemInOrder", async () => {
			server.use(
				http.get("*/api/scenes/rooms", () =>
					HttpResponse.json(["Quarto", "Sala", "Sem cômodo"]),
				),
			);

			await expect(fetchSceneRooms()).resolves.toEqual([
				"Quarto",
				"Sala",
				"Sem cômodo",
			]);
		});

		it("fetchSceneRooms_ServerError_ShouldThrow", async () => {
			server.use(
				http.get("*/api/scenes/rooms", () =>
					HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 }),
				),
			);

			await expect(fetchSceneRooms()).rejects.toThrow();
		});
	});

	describe("fetchScene", () => {
		it("fetchScene_ExistingId_ShouldReturnTheScene", async () => {
			const scene = createSceneMock({ id: "scene-9" });
			server.use(
				http.get("*/api/scenes/scene-9", () => HttpResponse.json(scene)),
			);

			await expect(fetchScene("scene-9")).resolves.toEqual(scene);
		});

		it("fetchScene_UnknownId_ShouldThrow", async () => {
			server.use(
				http.get("*/api/scenes/nope", () =>
					HttpResponse.json(
						{ title: "Not found", status: 404 },
						{ status: 404 },
					),
				),
			);

			await expect(fetchScene("nope")).rejects.toThrow();
		});
	});

	describe("createSceneRequest", () => {
		it("createSceneRequest_ValidPayload_ShouldPostBodyAndReturnCreatedId", async () => {
			let receivedBody: unknown;
			server.use(
				http.post("*/api/scenes", async ({ request }) => {
					receivedBody = await request.json();
					return HttpResponse.json(
						{ message: "Cena criada com sucesso!", sceneId: "scene-new" },
						{ status: 201 },
					);
				}),
			);
			const payload = {
				name: "Boa Noite",
				icon: "moon",
				items: [{ deviceId: "dev-1", isOn: false }],
			};

			const response = await createSceneRequest(payload);

			expect(receivedBody).toEqual(payload);
			expect(response).toEqual({
				message: "Cena criada com sucesso!",
				sceneId: "scene-new",
			});
		});

		it("createSceneRequest_ApiRejectsWithProblemDetails_ShouldSurfaceTheDetailMessage", async () => {
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

			await expect(
				createSceneRequest({
					name: "Segurança",
					items: [{ deviceId: "lock-1", isOn: true }],
				}),
			).rejects.toThrow(
				"Sensores, câmeras, fechaduras e alarmes não podem fazer parte de uma cena.",
			);
		});
	});

	describe("updateSceneRequest", () => {
		it("updateSceneRequest_ValidPayload_ShouldPutToTheSceneRoute", async () => {
			let receivedUrl = "";
			let receivedBody: unknown;
			server.use(
				http.put("*/api/scenes/:id", async ({ request }) => {
					receivedUrl = new URL(request.url).pathname;
					receivedBody = await request.json();
					return new HttpResponse(null, { status: 204 });
				}),
			);
			const payload = {
				name: "Renomeada",
				icon: null,
				items: [{ deviceId: "dev-1", isOn: true, brightness: 40 }],
			};

			await updateSceneRequest({ id: "scene-1", payload });

			expect(receivedUrl).toBe("/api/scenes/scene-1");
			expect(receivedBody).toEqual(payload);
		});
	});

	describe("deleteSceneRequest", () => {
		it("deleteSceneRequest_ExistingScene_ShouldCallDeleteOnTheSceneRoute", async () => {
			let called = false;
			server.use(
				http.delete("*/api/scenes/:id", () => {
					called = true;
					return new HttpResponse(null, { status: 204 });
				}),
			);

			await deleteSceneRequest("scene-1");

			expect(called).toBe(true);
		});
	});

	describe("activateSceneRequest", () => {
		it("activateSceneRequest_Success_ShouldReturnTheActivationResult", async () => {
			const result = createSceneActivationResultMock();
			server.use(
				http.post("*/api/scenes/:id/activate", () => HttpResponse.json(result)),
			);

			await expect(activateSceneRequest("scene-test-01")).resolves.toEqual(
				result,
			);
		});

		it("activateSceneRequest_SceneWithoutDevices_ShouldSurfaceTheDetailMessage", async () => {
			server.use(
				http.post("*/api/scenes/:id/activate", () =>
					HttpResponse.json(
						{
							title: "Scene.Validation.NoDevices",
							status: 422,
							detail:
								"A cena não tem dispositivos. Adicione ao menos um para ativá-la.",
						},
						{ status: 422 },
					),
				),
			);

			await expect(activateSceneRequest("scene-empty")).rejects.toThrow(
				"A cena não tem dispositivos. Adicione ao menos um para ativá-la.",
			);
		});
	});

	describe("fetchSceneDevices", () => {
		it("fetchSceneDevices_PagedResponse_ShouldReturnTheDevicesOfTheUser", async () => {
			const device = createSceneDeviceMock();
			server.use(
				http.get("*/api/devices", () => HttpResponse.json({ items: [device] })),
			);

			await expect(fetchSceneDevices()).resolves.toEqual([device]);
		});
	});
});
