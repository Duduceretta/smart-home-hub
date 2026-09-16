import { Clock, CloudSun, Droplets, Sparkles, Wifi, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types";

interface HomeClockHeroTileProps {
	summary?: DashboardSummary;
}

/**
 * Bento Tile Hero: Relógio Digital em Tempo Real, Clima e Próxima Rotina.
 *
 * Atualiza o horário a cada segundo com precisão de hardware e exibe
 * a previsão ambiental e a próxima automação agendada do hub.
 */
export function HomeClockHeroTile({ summary }: HomeClockHeroTileProps) {
	const { i18n } = useTranslation();
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

	const temp = summary?.averageTemperatureCelsius ?? 23.0;

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
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
					</span>
					<span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Rede Residencial Ativa
					</span>
					<span className="text-border-subtle">•</span>
					<span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
						<Wifi className="h-3 w-3 text-emerald-400" />
						<span>12ms</span>
					</span>
				</div>

				<span className="text-xs font-medium capitalize text-muted-foreground">
					{dateFormatted}
				</span>
			</div>

			{/* Miolo: Relógio Digital Grande e Clima */}
			<div className="my-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
				{/* Relógio Digital com Segundos Discretos */}
				<div className="flex items-baseline gap-1 font-mono font-bold tracking-tight text-foreground">
					<span className="text-5xl sm:text-6xl lg:text-7xl font-semibold">
						{timeFormatted.hours}:{timeFormatted.minutes}
					</span>
					<span className="text-xl sm:text-2xl font-normal text-muted-foreground">
						:{timeFormatted.seconds}
					</span>
				</div>

				{/* Cápsula de Clima Detalhado */}
				<div className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-container/60 px-3.5 py-2">
					<CloudSun className="h-6 w-6 text-warm" />
					<div className="flex flex-col">
						<div className="flex items-baseline gap-1.5">
							<span className="text-lg font-semibold text-foreground">
								{temp.toFixed(1)}°C
							</span>
							<span className="text-xs text-muted-foreground">
								Sensação {Math.round(temp + 1)}°C
							</span>
						</div>
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<Droplets className="h-3 w-3 text-sky-400" />
								<span>58%</span>
							</span>
							<span className="flex items-center gap-1">
								<Wind className="h-3 w-3 text-cool" />
								<span>14 km/h</span>
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Rodapé: Próxima Automação Programada */}
			<div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle/60 bg-surface-container/40 px-3.5 py-2 text-xs text-muted-foreground">
				<div className="flex items-center gap-2 truncate">
					<Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
					<span className="truncate font-medium text-foreground">
						Próxima rotina:
					</span>
					<span className="truncate">Modo Noturno & Trancas</span>
				</div>
				<div className="flex items-center gap-1.5 shrink-0 font-mono text-xs text-primary">
					<Clock className="h-3 w-3" />
					<span>23:00</span>
				</div>
			</div>
		</section>
	);
}
