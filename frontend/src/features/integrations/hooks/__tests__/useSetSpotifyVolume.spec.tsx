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
import { useSetSpotifyVolume } from "../useSetSpotifyVolume";

describe("useSetSpotifyVolume Integration Tests", () => {
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

	it("useSetSpotifyVolume_OnSuccess_SendsVolumeAndInvalidatesPlaybackQuery", async () => {
		// Arrange
		let payloadSent: unknown = null;
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.put("*/api/integrations/spotify/volume", async ({ request }) => {
				payloadSent = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);

		const { result } = renderHook(() => useSetSpotifyVolume(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate(85);

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(payloadSent).toEqual({ volume: 85 });
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: integrationsKeys.spotifyPlayback(),
		});
	});

	it("useSetSpotifyVolume_OnApiError_ShowsErrorToastAndStillInvalidatesOnSettled", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.put("*/api/integrations/spotify/volume", () => {
				return HttpResponse.json(
					{ title: "Error", detail: "Volume fora da faixa." },
					{ status: 400 },
				);
			}),
		);

		const { result } = renderHook(() => useSetSpotifyVolume(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate(120);

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(toastErrorSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				description: "Volume fora da faixa.",
			}),
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: integrationsKeys.spotifyPlayback(),
		});
	});
});
