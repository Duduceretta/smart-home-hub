import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { I18nextProvider } from "react-i18next";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { server } from "@/testing/mocks/server";
import { useConnectSpotify } from "../useConnectSpotify";

describe("useConnectSpotify Integration Tests", () => {
	let queryClient: QueryClient;
	let originalLocation: Location;
	let assignedHref = "";

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				mutations: { retry: false },
			},
		});
		assignedHref = "";
		originalLocation = window.location;

		delete (window as unknown as { location?: unknown }).location;
		(window as unknown as { location: unknown }).location = {
			...originalLocation,
			origin: "http://localhost:3000",
			protocol: "http:",
			host: "localhost:3000",
			hostname: "localhost",
			pathname: "/",
			search: "",
			hash: "",
			set href(val: string) {
				assignedHref = val;
			},
			get href() {
				return assignedHref || "http://localhost:3000/";
			},
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		(window as unknown as { location: unknown }).location = originalLocation;
		vi.restoreAllMocks();
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

	it("useConnectSpotify_OnSuccess_RedirectsWindowLocationToAuthorizeUrl", async () => {
		// Arrange
		const targetUrl = "https://accounts.spotify.com/authorize?client_id=sp-123";
		server.use(
			http.get("*/api/integrations/spotify/login", () => {
				return HttpResponse.json({ authorizeUrl: targetUrl }, { status: 200 });
			}),
		);

		const { result } = renderHook(() => useConnectSpotify(), {
			wrapper: createWrapper(),
		});

		// Act
		result.current.mutate();

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(assignedHref).toBe(targetUrl);
	});

	it("useConnectSpotify_OnApiError_ShowsErrorToastAndDoesNotRedirect", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		server.use(
			http.get("*/api/integrations/spotify/login", () => {
				return HttpResponse.json(
					{ title: "Unauthorized", detail: "Sessão expirada." },
					{ status: 401 },
				);
			}),
		);

		const { result } = renderHook(() => useConnectSpotify(), {
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
				description: "Sessão expirada.",
			}),
		);
		expect(assignedHref).toBe("");
	});
});
