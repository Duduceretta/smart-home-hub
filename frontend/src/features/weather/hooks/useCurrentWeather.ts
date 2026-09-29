import { useQuery } from "@tanstack/react-query";
import { fetchCurrentWeather } from "../api/weather.api";
import type { CurrentWeatherResponse } from "../types/weather.types";
import { weatherKeys } from "./weather.keys";

/**
 * Clima da residência (rodapé/cápsula do hero da Home). Clima muda pouco em
 * poucos minutos — staleTime alinhado ao TTL do cache server-side (20min),
 * sem sentido refetchar mais rápido que isso.
 */
export function useCurrentWeather() {
	return useQuery<CurrentWeatherResponse, Error>({
		queryKey: weatherKeys.current(),
		queryFn: ({ signal }) => fetchCurrentWeather(signal),
		staleTime: 1000 * 60 * 20,
		retry: 1,
	});
}
