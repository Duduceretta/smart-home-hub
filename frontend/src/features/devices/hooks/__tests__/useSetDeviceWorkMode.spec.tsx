import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { devicesKeys } from "../devices.keys";
import { useSetDeviceWorkMode } from "../useSetDeviceWorkMode";

/**
 * Sem `onMutate`/rollback aqui também (mesmo caso de `useSetDeviceVolume`)
 * — nenhuma escrita otimista no cache pra desfazer. O que uma falha de API
 * precisa garantir é o toast de erro e a invalidação (via `onSettled`) do
 * work-mode desse dispositivo específico, não travar num estado antigo.
 */
describe("useSetDeviceWorkMode Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
				mutations: { retry: false },
			},
		});
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("useSetDeviceWorkMode_ApiFails500_ShouldShowErrorToastAndStillInvalidateWorkModeCache", async () => {
		// Arrange
		server.use(
			http.put("*/api/devices/:id/work-mode", () =>
				HttpResponse.json({ title: "Falha ao trocar modo" }, { status: 500 }),
			),
		);
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSetDeviceWorkMode(), { wrapper });

		// Act
		result.current.mutate({ deviceId: "lamp-01", workMode: "colour" });

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(toastErrorSpy).toHaveBeenCalledWith(
			"Não foi possível trocar o modo do dispositivo",
			expect.objectContaining({ description: expect.any(String) }),
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: devicesKeys.workMode("lamp-01"),
		});
	});

	it("useSetDeviceWorkMode_Success_ShouldInvalidateWorkModeCacheForThatDevice", async () => {
		// Arrange
		server.use(
			http.put(
				"*/api/devices/:id/work-mode",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSetDeviceWorkMode(), { wrapper });

		// Act
		result.current.mutate({ deviceId: "lamp-01", workMode: "white" });

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: devicesKeys.workMode("lamp-01"),
		});
	});
});
