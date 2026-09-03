import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import type { SpotifyPlaybackState } from "../../types/integrations.types";
import { useSpotifyPlayback } from "../useSpotifyPlayback";

describe("useSpotifyPlayback Integration Tests", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});
	});

	function createWrapper() {
		return function Wrapper({ children }: { children: React.ReactNode }) {
			return (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);
		};
	}

	it("useSpotifyPlayback_WhenEnabled_FetchesPlaybackState", async () => {
		// Arrange
		const playbackPayload: SpotifyPlaybackState = {
			volumePercent: 50,
			isPlaying: true,
			title: "Song X",
			artist: "Artist Y",
			albumCoverUrl: "https://example.com/art.png",
			deviceName: "Smart Speaker",
		};
		server.use(
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(playbackPayload, { status: 200 });
			}),
		);

		// Act
		const { result } = renderHook(() => useSpotifyPlayback({ enabled: true }), {
			wrapper: createWrapper(),
		});

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual(playbackPayload);
	});

	it("useSpotifyPlayback_WhenDisabled_DoesNotFetch", async () => {
		// Arrange
		let called = false;
		server.use(
			http.get("*/api/integrations/spotify/playback", () => {
				called = true;
				return HttpResponse.json(null, { status: 200 });
			}),
		);

		// Act
		const { result } = renderHook(
			() => useSpotifyPlayback({ enabled: false }),
			{
				wrapper: createWrapper(),
			},
		);

		// Assert
		expect(result.current.fetchStatus).toBe("idle");
		expect(called).toBe(false);
	});
});
