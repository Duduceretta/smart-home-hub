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
import {
	useSkipToNextSpotifyTrack,
	useSkipToPreviousSpotifyTrack,
} from "../useSkipSpotifyTrack";

describe("useSkipSpotifyTrack Integration Tests", () => {
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

	describe("useSkipToNextSpotifyTrack", () => {
		it("useSkipToNextSpotifyTrack_OnSuccess_InvalidatesPlaybackQuery", async () => {
			// Arrange
			const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.post("*/api/integrations/spotify/next", () => {
					return new HttpResponse(null, { status: 200 });
				}),
			);

			const { result } = renderHook(() => useSkipToNextSpotifyTrack(), {
				wrapper: createWrapper(),
			});

			// Act
			result.current.mutate();

			// Assert
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
		});

		it("useSkipToNextSpotifyTrack_OnApiError_ShowsErrorToastAndStillInvalidatesOnSettled", async () => {
			// Arrange
			const toastErrorSpy = vi.spyOn(toast, "error");
			const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.post("*/api/integrations/spotify/next", () => {
					return HttpResponse.json(
						{ title: "Error", detail: "Fim da fila." },
						{ status: 400 },
					);
				}),
			);

			const { result } = renderHook(() => useSkipToNextSpotifyTrack(), {
				wrapper: createWrapper(),
			});

			// Act
			result.current.mutate();

			// Assert
			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(toastErrorSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					description: "Fim da fila.",
				}),
			);
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
		});
	});

	describe("useSkipToPreviousSpotifyTrack", () => {
		it("useSkipToPreviousSpotifyTrack_OnSuccess_InvalidatesPlaybackQuery", async () => {
			// Arrange
			const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.post("*/api/integrations/spotify/previous", () => {
					return new HttpResponse(null, { status: 200 });
				}),
			);

			const { result } = renderHook(() => useSkipToPreviousSpotifyTrack(), {
				wrapper: createWrapper(),
			});

			// Act
			result.current.mutate();

			// Assert
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
		});

		it("useSkipToPreviousSpotifyTrack_OnApiError_ShowsErrorToastAndStillInvalidatesOnSettled", async () => {
			// Arrange
			const toastErrorSpy = vi.spyOn(toast, "error");
			const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
			server.use(
				http.post("*/api/integrations/spotify/previous", () => {
					return HttpResponse.json(
						{ title: "Error", detail: "Não há faixa anterior." },
						{ status: 400 },
					);
				}),
			);

			const { result } = renderHook(() => useSkipToPreviousSpotifyTrack(), {
				wrapper: createWrapper(),
			});

			// Act
			result.current.mutate();

			// Assert
			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(toastErrorSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					description: "Não há faixa anterior.",
				}),
			);
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
		});
	});
});
