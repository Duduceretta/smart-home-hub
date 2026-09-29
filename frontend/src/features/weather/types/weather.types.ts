/**
 * Espelha `CurrentWeatherDto` (backend).
 */
export interface CurrentWeather {
	temperatureCelsius: number;
	feelsLikeCelsius: number;
	humidityPercent: number;
	windSpeedKmh: number;
	condition: string;
}

/**
 * Espelha `CurrentWeatherResponse` (backend). `hasLocation=false` = usuário
 * nunca configurou localização (mostra CTA de ativar). `hasLocation=true,
 * weather=null` = localização configurada mas o provedor externo falhou
 * agora — estados diferentes, nunca confundidos na UI.
 */
export interface CurrentWeatherResponse {
	hasLocation: boolean;
	weather: CurrentWeather | null;
}
