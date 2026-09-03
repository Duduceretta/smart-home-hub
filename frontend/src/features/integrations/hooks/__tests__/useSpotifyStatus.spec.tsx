import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import type { SpotifyStatus } from "../../types/integrations.types";
import { useSpotifyStatus } from "../useSpotifyStatus";

describe("useSpotifyStatus Integration Tests", () => {
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

	it("useSpotifyStatus_OnSuccess_FetchesAndReturnsStatus", async () => {
		// Arrange
		const statusPayload: SpotifyStatus = {
			connected: true,
			displayName: "Spotify User",
		};
		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				return HttpResponse.json(statusPayload, { status: 200 });
			}),
		);

		// Act
		const { result } = renderHook(() => useSpotifyStatus(), {
			wrapper: createWrapper(),
		});

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual(statusPayload);
	});
});
