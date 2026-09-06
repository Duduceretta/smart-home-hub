import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { devicesKeys } from "../devices.keys";
import { useSetDeviceVolume } from "../useSetDeviceVolume";

/**
 * Este hook não faz atualização otimista (sem `onMutate`/rollback) — o
 * valor exibido durante o arraste vive em `useDeviceCardVolume`, fora
 * daqui. O que existe pra testar numa falha de API é: toast de erro,
 * log, e que a invalidação de cache (`onSettled`) roda de qualquer jeito,
 * sem deixar a query de mídia presa num estado desatualizado.
 */
describe("useSetDeviceVolume Integration Tests", () => {
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

	it("useSetDeviceVolume_ApiFails500_ShouldShowErrorToastAndStillInvalidateMediaCache", async () => {
		// Arrange
		server.use(
			http.put("*/api/devices/:id/volume", () =>
				HttpResponse.json(
					{ title: "Falha ao ajustar volume" },
					{ status: 500 },
				),
			),
		);
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSetDeviceVolume(), { wrapper });

		// Act
		result.current.mutate({ deviceId: "tv-01", volume: 60 });

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(toastErrorSpy).toHaveBeenCalledWith(
			"Não foi possível ajustar o volume da TV",
			expect.objectContaining({ description: expect.any(String) }),
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: devicesKeys.media("tv-01"),
		});
	});

	it("useSetDeviceVolume_Success_ShouldInvalidateMediaCacheForThatDevice", async () => {
		// Arrange
		server.use(
			http.put(
				"*/api/devices/:id/volume",
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSetDeviceVolume(), { wrapper });

		// Act
		result.current.mutate({ deviceId: "tv-01", volume: 60 });

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: devicesKeys.media("tv-01"),
		});
	});
});
