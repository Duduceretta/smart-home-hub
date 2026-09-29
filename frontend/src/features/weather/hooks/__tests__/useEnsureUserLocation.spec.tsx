import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import { useEnsureUserLocation } from "../useEnsureUserLocation";

const WEATHER_URL = "http://localhost:5252/api/weather/current";
const LOCATION_URL = "http://localhost:5252/api/users/me/location";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("useEnsureUserLocation", () => {
	const originalGeolocation = navigator.geolocation;

	beforeEach(() => {
		server.use(
			http.get(WEATHER_URL, () =>
				HttpResponse.json({ hasLocation: false, weather: null }),
			),
		);
	});

	afterEach(() => {
		Object.defineProperty(navigator, "geolocation", {
			value: originalGeolocation,
			configurable: true,
		});
		vi.restoreAllMocks();
	});

	it("Mount_ShouldNeverAutoPromptGeolocation_OnlyOnExplicitTrigger", async () => {
		const getCurrentPosition = vi.fn();
		Object.defineProperty(navigator, "geolocation", {
			value: { getCurrentPosition },
			configurable: true,
		});

		const { result } = renderHook(() => useEnsureUserLocation(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.needsLocation).toBe(true));

		// Nenhuma chamada de geolocalização automática — best practice do
		// Google Geolocation API (nunca pedir permissão no carregamento).
		expect(getCurrentPosition).not.toHaveBeenCalled();
	});

	it("RequestLocation_ShouldInvokeGetCurrentPositionOnlyWhenCalled", async () => {
		const getCurrentPosition = vi.fn();
		Object.defineProperty(navigator, "geolocation", {
			value: { getCurrentPosition },
			configurable: true,
		});

		const { result } = renderHook(() => useEnsureUserLocation(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.needsLocation).toBe(true));

		result.current.requestLocation();

		expect(getCurrentPosition).toHaveBeenCalledTimes(1);
	});

	it("RequestLocation_OnSuccess_ShouldSaveCoordinatesToBackend", async () => {
		let receivedBody: unknown;
		server.use(
			http.put(LOCATION_URL, async ({ request }) => {
				receivedBody = await request.json();
				return HttpResponse.json({});
			}),
		);

		Object.defineProperty(navigator, "geolocation", {
			value: {
				getCurrentPosition: (success: PositionCallback) => {
					success({
						coords: { latitude: -23.55, longitude: -46.63 },
					} as GeolocationPosition);
				},
			},
			configurable: true,
		});

		const { result } = renderHook(() => useEnsureUserLocation(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.needsLocation).toBe(true));

		result.current.requestLocation();

		await waitFor(() => {
			expect(receivedBody).toEqual({ latitude: -23.55, longitude: -46.63 });
		});
	});

	it("RequestLocation_PermissionDenied_ShouldExposeDeniedStateWithoutThrowingOrRetrying", async () => {
		const getCurrentPosition = vi.fn(
			(_success: PositionCallback, error?: PositionErrorCallback) => {
				error?.({ code: 1, message: "User denied Geolocation" } as GeolocationPositionError);
			},
		);
		Object.defineProperty(navigator, "geolocation", {
			value: { getCurrentPosition },
			configurable: true,
		});

		const { result } = renderHook(() => useEnsureUserLocation(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.needsLocation).toBe(true));

		expect(() => result.current.requestLocation()).not.toThrow();

		await waitFor(() => expect(result.current.permissionDenied).toBe(true));
		expect(getCurrentPosition).toHaveBeenCalledTimes(1);
	});

	it("RequestLocation_UnsupportedBrowser_ShouldNotThrow_ShouldExposeDeniedState", async () => {
		Object.defineProperty(navigator, "geolocation", {
			value: undefined,
			configurable: true,
		});

		const { result } = renderHook(() => useEnsureUserLocation(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.needsLocation).toBe(true));

		expect(() => result.current.requestLocation()).not.toThrow();
		await waitFor(() => expect(result.current.permissionDenied).toBe(true));
	});

	it("LocationAlreadyConfigured_ShouldReportNeedsLocationFalse", async () => {
		server.use(
			http.get(WEATHER_URL, () =>
				HttpResponse.json({
					hasLocation: true,
					weather: {
						temperatureCelsius: 21,
						feelsLikeCelsius: 22,
						humidityPercent: 58,
						windSpeedKmh: 14,
						condition: "Clear",
					},
				}),
			),
		);

		const { result } = renderHook(() => useEnsureUserLocation(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.needsLocation).toBe(false));
	});
});
