import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { CurrentWeatherResponse } from "../types/weather.types";

/**
 * Fetches the current weather for the user's saved home location. Real
 * data (Open-Meteo, cached server-side by rounded location) — never mocked.
 */
export async function fetchCurrentWeather(
	signal?: AbortSignal,
): Promise<CurrentWeatherResponse> {
	try {
		const { data } = await apiClient.get<CurrentWeatherResponse>(
			"/weather/current",
			{ signal },
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o clima.",
		);
	}
}

/**
 * Saves the home's location — captured once via the browser's Geolocation
 * API (explicit user gesture, never auto-prompted), never re-asked after.
 */
export async function updateUserLocation(
	latitude: number,
	longitude: number,
): Promise<void> {
	try {
		await apiClient.put("/users/me/location", { latitude, longitude });
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível salvar a localização.",
		);
	}
}
