import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudLightning,
	CloudRain,
	CloudSnow,
	CloudSun,
	type LucideIcon,
	Sun,
} from "lucide-react";

/**
 * Espelha `WeatherCodeToCondition` em `OpenMeteoWeatherProvider.cs` — só
 * esses 7 valores existem hoje. Condição desconhecida (provedor novo,
 * futuro) cai no ícone genérico em vez de quebrar.
 */
const CONDITION_ICONS: Record<string, LucideIcon> = {
	Clear: Sun,
	Clouds: Cloud,
	Fog: CloudFog,
	Drizzle: CloudDrizzle,
	Rain: CloudRain,
	Snow: CloudSnow,
	Thunderstorm: CloudLightning,
};

export function getWeatherConditionIcon(condition: string): LucideIcon {
	return CONDITION_ICONS[condition] ?? CloudSun;
}
