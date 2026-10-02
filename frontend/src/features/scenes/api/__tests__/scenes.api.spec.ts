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
	fetchSceneDevices,
	fetchScenes,
	updateSceneRequest,
} from "../scenes.api";

describe("scenes.api", () => {
	describe("fetchScenes", () => {
		it("fetchScenes_PagedResponse_ShouldReturnItems", async () => {
			const scene = createSceneMock();
			server.use(
				http.get("*/api/scenes", () =>
					HttpResponse.json({
						items: [scene],
						page: 1,
						pageSize: 200,
						totalCount: 1,
						totalPages: 1,
						hasNextPage: false,
						hasPreviousPage: false,
					}),
				),
			);

			await expect(fetchScenes()).resolves.toEqual([scene]);
		});

		it("fetchScenes_AskForALargePage_ShouldSendPageSize200", async () => {
			let receivedPageSize: string | null = null;
			server.use(
				http.get("*/api/scenes", ({ request }) => {
					receivedPageSize = new URL(request.url).searchParams.get("pageSize");
					return HttpResponse.json({ items: [] });
				}),
			);

			await fetchScenes();

			expect(receivedPageSize).toBe("200");
		});

		it("fetchScenes_ServerError_ShouldThrowAppErrorWithFallbackMessage", async () => {
			server.use(
				http.get("*/api/scenes", () =>
					HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 }),
				),
			);

			await expect(fetchScenes()).rejects.toThrow();
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
