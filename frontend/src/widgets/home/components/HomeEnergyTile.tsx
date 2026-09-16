import { TrendingDown, Zap } from "lucide-react";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types";

interface HomeEnergyTileProps {
	summary?: DashboardSummary;
}

/**
 * Bento Tile: Monitoramento de Energia & Carga em Tempo Real.
 *
 * Exibe a potência instantânea consumida na residência,
 * a divisão por categorias principais e a estabilidade da rede.
 */
export function HomeEnergyTile({ summary }: HomeEnergyTileProps) {
	const energyKwh = summary?.energyConsumptionKwh ?? 2.8;

	return (
		<section className="flex h-full flex-col justify-between gap-3.5 rounded-xl border border-border-subtle bg-surface-low p-4 sm:p-5 shadow-2xs transition-all hover:border-warm/30 hover:shadow-lg hover:shadow-warm/5">
			{/* Topo */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warm/10">
						<Zap className="h-3.5 w-3.5 text-warm" />
					</div>
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Energia & Carga
					</h2>
				</div>
				<span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
					<TrendingDown className="h-3 w-3" />
					<span>-8% vs ontem</span>
				</span>
			</div>

			{/* Indicador Principal de Potência Instantânea */}
			<div className="flex items-baseline justify-between rounded-lg border border-border-subtle bg-surface-container/60 p-3.5">
				<div className="flex flex-col">
					<span className="text-xs text-muted-foreground">
						Potência Instantânea
					</span>
					<div className="flex items-baseline gap-1 font-mono">
						<span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
							465
						</span>
						<span className="text-xs font-medium text-muted-foreground">
							Watts
						</span>
					</div>
				</div>

				<div className="flex flex-col items-end text-right">
					<span className="text-xs text-muted-foreground">Consumo Hoje</span>
					<span className="font-mono text-sm font-semibold text-foreground">
						{energyKwh.toFixed(1)} kWh
					</span>
				</div>
			</div>

			{/* Mini barra de carga dos circuitos */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>Carga do Quadro (127V • 60Hz)</span>
					<span className="font-mono font-medium text-foreground">
						22% da capacidade
					</span>
				</div>
				<div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container border border-border-subtle">
					<div
						className="h-full bg-amber-400 transition-all"
						style={{ width: "45%" }}
					/>
					<div
						className="h-full bg-primary transition-all"
						style={{ width: "25%" }}
					/>
					<div
						className="h-full bg-sky-400 transition-all"
						style={{ width: "15%" }}
					/>
				</div>
				<div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
					<span className="flex items-center gap-1">
						<span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
						Clima 210W
					</span>
					<span className="flex items-center gap-1">
						<span className="h-1.5 w-1.5 rounded-full bg-primary" />
						Luzes 115W
					</span>
					<span className="flex items-center gap-1">
						<span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
						Outros 140W
					</span>
				</div>
			</div>
		</section>
	);
}
