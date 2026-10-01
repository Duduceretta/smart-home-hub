import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSceneActivationResultMock } from "@/testing/mocks/scenes.mock";
import { server } from "@/testing/mocks/server";
import { createTestQueryClient } from "@/testing/test-utils";
import type { SaveScenePayload } from "../../types/scenes.types";
import { scenesKeys } from "../scenes.keys";
import { useActivateScene } from "../useActivateScene";
import { useCreateScene } from "../useCreateScene";
import { useDeleteScene } from "../useDeleteScene";
import { useUpdateScene } from "../useUpdateScene";

describe("scene mutation hooks", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const payload: SaveScenePayload = {
		name: "Boa Noite",
		icon: "moon",
		items: [{ deviceId: "dev-1", isOn: false }],
	};

	describe("useCreateScene", () => {
		it("useCreateScene_Success_ShouldInvalidateListsAndToastTheApiMessage", async () => {
			const toastSuccess = vi.spyOn(toast, "success");
			const invalidate = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.post("*/api/scenes", () =>
					HttpResponse.json(
						{ message: "Cena criada com sucesso!", sceneId: "scene-new" },
						{ status: 201 },
					),
				),
			);
			const { result } = renderHook(() => useCreateScene(), { wrapper });

			result.current.mutate(payload);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(invalidate).toHaveBeenCalledWith({ queryKey: scenesKeys.lists() });
			expect(toastSuccess).toHaveBeenCalledWith("Cena criada com sucesso!");
		});

		it("useCreateScene_ApiRejects_ShouldToastTheDetailAndNotInvalidate", async () => {
			const toastError = vi.spyOn(toast, "error");
			const invalidate = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.post("*/api/scenes", () =>
					HttpResponse.json(
						{
							title: "Scene.InvalidDevices",
							status: 400,
							detail: "Um ou mais dispositivos informados não existem.",
						},
						{ status: 400 },
					),
				),
			);
			const { result } = renderHook(() => useCreateScene(), { wrapper });

			result.current.mutate(payload);

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(toastError).toHaveBeenCalledWith(
				"Um ou mais dispositivos informados não existem.",
			);
			expect(invalidate).not.toHaveBeenCalled();
		});
	});

	describe("useUpdateScene", () => {
		it("useUpdateScene_Success_ShouldInvalidateTheWholeSceneCacheAndToast", async () => {
			const toastSuccess = vi.spyOn(toast, "success");
			const invalidate = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.put(
					"*/api/scenes/:id",
					() => new HttpResponse(null, { status: 204 }),
				),
			);
			const { result } = renderHook(() => useUpdateScene(), { wrapper });

			result.current.mutate({ id: "scene-1", payload });

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(invalidate).toHaveBeenCalledWith({ queryKey: scenesKeys.all });
			expect(toastSuccess).toHaveBeenCalledWith("Cena atualizada com sucesso!");
		});
	});

	describe("useDeleteScene", () => {
		it("useDeleteScene_Success_ShouldInvalidateListsAndToast", async () => {
			const toastSuccess = vi.spyOn(toast, "success");
			const invalidate = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.delete(
					"*/api/scenes/:id",
					() => new HttpResponse(null, { status: 204 }),
				),
			);
			const { result } = renderHook(() => useDeleteScene(), { wrapper });

			result.current.mutate("scene-1");

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(invalidate).toHaveBeenCalledWith({ queryKey: scenesKeys.lists() });
			expect(toastSuccess).toHaveBeenCalledWith("Cena removida com sucesso!");
		});
	});

	describe("useActivateScene", () => {
		const activate = async (
			result: ReturnType<typeof createSceneActivationResultMock>,
		) => {
			server.use(
				http.post("*/api/scenes/:id/activate", () => HttpResponse.json(result)),
			);
			const hook = renderHook(() => useActivateScene(), { wrapper });
			hook.result.current.mutate("scene-test-01");
			await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
		};

		it("useActivateScene_EveryDeviceApplied_ShouldToastSuccessAndRefreshLastActivation", async () => {
			const toastSuccess = vi.spyOn(toast, "success");
			const invalidate = vi.spyOn(queryClient, "invalidateQueries");

			await activate(createSceneActivationResultMock());

			expect(toastSuccess).toHaveBeenCalledWith('Cena "Modo Cinema" ativada');
			expect(invalidate).toHaveBeenCalledWith({ queryKey: scenesKeys.lists() });
		});

		it("useActivateScene_SomeDevicesOfflineOrFailed_ShouldToastWarningWithTheBreakdown", async () => {
			const toastWarning = vi.spyOn(toast, "warning");

			await activate(
				createSceneActivationResultMock({
					appliedCount: 2,
					failedCount: 1,
					skippedCount: 1,
				}),
			);

			expect(toastWarning).toHaveBeenCalledWith(
				'Cena "Modo Cinema" ativada com ressalvas',
				{ description: "2 de 4 aplicados · 1 offline · 1 com falha" },
			);
		});

		it("useActivateScene_NothingApplied_ShouldToastError", async () => {
			const toastError = vi.spyOn(toast, "error");

			await activate(
				createSceneActivationResultMock({
					appliedCount: 0,
					failedCount: 1,
					skippedCount: 1,
				}),
			);

			expect(toastError).toHaveBeenCalledWith(
				'Nenhum dispositivo respondeu à cena "Modo Cinema"',
				{ description: "0 de 2 aplicados · 1 offline · 1 com falha" },
			);
		});

		it("useActivateScene_SceneWithoutDevices_ShouldToastTheApiDetail", async () => {
			const toastError = vi.spyOn(toast, "error");
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
			const { result } = renderHook(() => useActivateScene(), { wrapper });

			result.current.mutate("scene-empty");

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(toastError).toHaveBeenCalledWith(
				"A cena não tem dispositivos. Adicione ao menos um para ativá-la.",
			);
		});
	});
});
