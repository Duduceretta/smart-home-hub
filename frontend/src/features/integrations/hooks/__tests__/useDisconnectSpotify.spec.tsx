import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { I18nextProvider } from "react-i18next";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { server } from "@/testing/mocks/server";
import { integrationsKeys } from "../integrations.keys";
import { useDisconnectSpotify } from "../useDisconnectSpotify";

describe("useDisconnectSpotify Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				mutations: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	function createWrapper() {
		return function Wrapper({ children }: { children: React.ReactNode }) {
			return (
				<QueryClientProvider client={queryClient}>
					<I18nextProvider i18n={i18n}>{children}</I18nextProvider>
				</QueryClientProvider>
			);
		};
	}

	it("useDisconnectSpotify_OnSuccess_InvalidatesStatusAndPlaybackAndShowsToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete("*/api/integrations/spotify", () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const { result } = renderHook(() => useDisconnectSpotify(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate();

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: integrationsKeys.spotifyStatus(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: integrationsKeys.spotifyPlayback(),
		});
		expect(toastSuccessSpy).toHaveBeenCalled();
	});

	it("useDisconnectSpotify_OnApiError_ShowsToastErrorWithoutInvalidating", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.delete("*/api/integrations/spotify", () => {
				return HttpResponse.json(
					{ title: "Bad Request", detail: "Erro ao desconectar." },
					{ status: 400 },
				);
			}),
		);

		const { result } = renderHook(() => useDisconnectSpotify(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate();

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(toastErrorSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				description: "Erro ao desconectar.",
			}),
		);
	});
});
