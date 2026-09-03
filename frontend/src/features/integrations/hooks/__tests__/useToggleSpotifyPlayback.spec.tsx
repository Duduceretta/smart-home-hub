import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { I18nextProvider } from "react-i18next";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { server } from "@/testing/mocks/server";
import type { SpotifyPlaybackState } from "../../types/integrations.types";
import { integrationsKeys } from "../integrations.keys";
import { useToggleSpotifyPlayback } from "../useToggleSpotifyPlayback";

describe("useToggleSpotifyPlayback Integration Tests", () => {
	let queryClient: QueryClient;

	const initialPlayback: SpotifyPlaybackState = {
		volumePercent: 50,
		isPlaying: false,
		title: "Song A",
		artist: "Artist B",
		albumCoverUrl: null,
		deviceName: "Echo Dot",
	};

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				mutations: { retry: false },
			},
		});
		queryClient.setQueryData(
			integrationsKeys.spotifyPlayback(),
			initialPlayback,
		);
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

	it("useToggleSpotifyPlayback_OnMutateAndSuccess_OptimisticallyTogglesAndInvalidates", async () => {
		// Arrange
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		server.use(
			http.put("*/api/integrations/spotify/toggle", () => {
				return new HttpResponse(null, { status: 200 });
			}),
		);

		const { result } = renderHook(() => useToggleSpotifyPlayback(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate();

		// Assert: Optimistic update occurs
		await waitFor(() => {
			const cached = queryClient.getQueryData<SpotifyPlaybackState>(
				integrationsKeys.spotifyPlayback(),
			);
			expect(cached?.isPlaying).toBe(true);
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: integrationsKeys.spotifyPlayback(),
		});
	});

	it("useToggleSpotifyPlayback_OnApiError_RollsBackCacheAndShowsErrorToast", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		server.use(
			http.put("*/api/integrations/spotify/toggle", () => {
				return HttpResponse.json(
					{ title: "Error", detail: "Dispositivo Spotify offline." },
					{ status: 503 },
				);
			}),
		);

		const { result } = renderHook(() => useToggleSpotifyPlayback(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate();

		// Assert
		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		const cachedAfterError = queryClient.getQueryData<SpotifyPlaybackState>(
			integrationsKeys.spotifyPlayback(),
		);
		expect(cachedAfterError?.isPlaying).toBe(false);

		expect(toastErrorSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				description: "Dispositivo Spotify offline.",
			}),
		);
	});
});
