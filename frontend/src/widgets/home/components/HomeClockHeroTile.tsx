import { Clock, Droplets, MapPin, Sparkles, Wifi, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { Button } from "@/core/components/ui/button";
import {
	type ConnectionStatus,
	useConnectionStatus,
} from "@/core/hooks/useConnectionStatus";
import { useNextScheduledAutomation } from "@/features/automations/hooks/useNextScheduledAutomation";
import { useCurrentWeather } from "@/features/weather/hooks/useCurrentWeather";
import { useEnsureUserLocation } from "@/features/weather/hooks/useEnsureUserLocation";
import { getWeatherConditionIcon } from "@/features/weather/lib/getWeatherConditionIcon";
import { formatNextRun } from "../utils/formatNextRun";

const NETWORK_STATUS_STYLES: Record<
	ConnectionStatus,
	{ label: string; dotClass: string; pingClass: string }
> = {
	connected: {
		label: "Rede Residencial Online",
		dotClass: "bg-emerald-500",
		pingClass: "bg-emerald-400",
	},
	reconnecting: {
		label: "Rede Residencial Reconectando",
		dotClass: "bg-warm",
		pingClass: "bg-warm",
	},
	disconnected: {
		label: "Rede Residencial Offline",
		dotClass: "bg-alert",
		pingClass: "bg-alert",
	},
};

/**
 * Bento Tile Hero: Relógio Digital em Tempo Real, Clima e Próxima Rotina.
 *
 * Atualiza o horário a cada segundo com precisão de hardware e exibe
 * a previsão ambiental e a próxima automação agendada do hub.
 */
export function HomeClockHeroTile() {
	const { i18n } = useTranslation();
	const { status, latencyMs } = useConnectionStatus();
	const { data: nextScheduledAutomation } = useNextScheduledAutomation();
	const {
		data: weatherResponse,
		isLoading: isWeatherLoading,
		refetch: refetchWeather,
	} = useCurrentWeather();
	const { needsLocation, requestLocation, isSaving, permissionDenied } =
		useEnsureUserLocation();
	const [currentTime, setCurrentTime] = useState(() => new Date());

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	const timeFormatted = useMemo(() => {
		const hours = String(currentTime.getHours()).padStart(2, "0");
		const minutes = String(currentTime.getMinutes()).padStart(2, "0");
		const seconds = String(currentTime.getSeconds()).padStart(2, "0");
		return { hours, minutes, seconds };
	}, [currentTime]);

	const dateFormatted = useMemo(() => {
		const locale = i18n.language === "pt-BR" ? "pt-BR" : "en-US";
		return new Intl.DateTimeFormat(locale, {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(currentTime);
	}, [currentTime, i18n.language]);

	const networkStatusStyle = NETWORK_STATUS_STYLES[status];
	const weather = weatherResponse?.weather ?? null;
	const WeatherIcon = weather ? getWeatherConditionIcon(weather.condition) : null;

	return (
		// Hero: único tile com padding maior e borda tingida de --primary — dá
		// peso visual real ao invés de repetir o mesmo tratamento dos 6 tiles
		// satélite (hierarquia por tamanho, não só por lg:col-span-8).
		<section className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-primary/15 bg-surface-low p-5 sm:p-6 shadow-2xs">
			{/* Gradiente sutil decorativo de fundo */}
			<div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/8 blur-3xl" />

			{/* Linha Superior: Status da Malha e Data Completa */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/50 pb-3">
				<div className="flex items-center gap-2">
					<span className="relative flex h-2 w-2">
						{status !== "disconnected" && (
							<span
								className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${networkStatusStyle.pingClass}`}
							/>
						)}
						<span
							className={`relative inline-flex h-2 w-2 rounded-full ${networkStatusStyle.dotClass}`}
						/>
					</span>
					<span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{networkStatusStyle.label}
					</span>
					<span className="text-border-subtle">•</span>
					<span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
						<Wifi className="h-3 w-3" />
						<span>
							{status === "connected" && latencyMs !== null
								? `${latencyMs}ms`
								: "—"}
						</span>
					</span>
				</div>

				<span className="text-xs font-medium capitalize text-muted-foreground">
					{dateFormatted}
				</span>
			</div>

			{/* Miolo: Relógio Digital Grande e Clima */}
			<div className="my-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				{/* Relógio Digital com Segundos Discretos */}
				<div className="flex items-baseline gap-1 font-mono font-bold tracking-tight text-foreground">
					<span className="text-5xl sm:text-6xl lg:text-7xl font-semibold">
						{timeFormatted.hours}:{timeFormatted.minutes}
					</span>
					<span className="text-xl sm:text-2xl font-normal text-muted-foreground">
						:{timeFormatted.seconds}
					</span>
				</div>

				{/* Cápsula de Clima Detalhado — real (Open-Meteo), nunca placeholder */}
				{isWeatherLoading ? (
					<div
						role="status"
						aria-label="Carregando clima"
						className="flex h-[52px] w-44 items-center gap-4 rounded-lg border border-border-subtle bg-surface-container/60 px-3.5 py-2 animate-pulse"
					>
						<div className="h-6 w-6 shrink-0 rounded-full bg-surface-high" />
						<div className="flex flex-1 flex-col gap-1.5">
							<div className="h-3.5 w-20 rounded bg-surface-high" />
							<div className="h-3 w-28 rounded bg-surface-high" />
						</div>
					</div>
				) : weather ? (
					<div className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-container/60 px-3.5 py-2">
						{WeatherIcon && <WeatherIcon className="h-6 w-6 text-warm" />}
						<div className="flex flex-col">
							<div className="flex items-baseline gap-1.5">
								<span className="text-lg font-semibold text-foreground">
									{weather.temperatureCelsius.toFixed(1)}°C
								</span>
								<span className="text-xs text-muted-foreground">
									Sensação {Math.round(weather.feelsLikeCelsius)}°C
								</span>
							</div>
							<div className="flex items-center gap-3 text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<Droplets className="h-3 w-3 text-sky-400" />
									<span>{Math.round(weather.humidityPercent)}%</span>
								</span>
								<span className="flex items-center gap-1">
									<Wind className="h-3 w-3 text-cool" />
									<span>{Math.round(weather.windSpeedKmh)} km/h</span>
								</span>
							</div>
						</div>
					</div>
				) : needsLocation ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={requestLocation}
						disabled={isSaving}
						className="gap-2 text-muted-foreground"
					>
						<MapPin className="h-3.5 w-3.5" />
						{isSaving
							? "Salvando..."
							: permissionDenied
								? "Permissão bloqueada"
								: "Ativar localização"}
					</Button>
				) : (
					// Restante dos casos: request falhou OU provedor respondeu sem leitura.
					// Mesma altura do skeleton (h-[52px]) pra o relógio não refluir.
					<CardErrorFallback
						message="Clima indisponível"
						retryLabel="Tentar de novo"
						onRetry={() => refetchWeather()}
						className="h-[52px] min-w-44 gap-3 bg-surface-container/60"
					/>
				)}
			</div>

			{/* Rodapé: Próxima Automação Agendada (real, Schedule ativa mais próxima) */}
			<div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle/60 bg-surface-container/40 px-3.5 py-2 text-xs text-muted-foreground">
				{nextScheduledAutomation ? (
					<>
						<div className="flex items-center gap-2 truncate">
							<Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
							<span className="truncate font-medium text-foreground">
								Próxima rotina:
							</span>
							<span className="truncate">{nextScheduledAutomation.name}</span>
						</div>
						<div className="flex items-center gap-1.5 shrink-0 font-mono text-xs text-primary">
							<Clock className="h-3 w-3" />
							<span>
								{formatNextRun(
									nextScheduledAutomation.nextRunUtc,
									i18n.language,
								)}
							</span>
						</div>
					</>
				) : (
					<div className="flex items-center gap-2 truncate">
						<Sparkles className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
						<span className="truncate">Nenhuma rotina agendada</span>
					</div>
				)}
			</div>
		</section>
	);
}
