import { TrendingDown, Zap } from "lucide-react";
import { cn } from "@/core/utils";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types";
import { CATEGORY_FILL_CLASS } from "../constants/home-categories";

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
		<section className="flex h-full flex-col justify-between gap-3.5 rounded-xl border border-border-subtle bg-card p-4 sm:p-5 shadow-2xs">
			{/* Topo */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-popover">
						<Zap className="h-3.5 w-3.5 text-muted-foreground" />
					</div>
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Energia & Carga
					</h2>
				</div>
				<span className="flex items-center gap-1 text-xs font-medium text-success">
					<TrendingDown className="h-3 w-3" />
					<span>-8% vs ontem</span>
				</span>
			</div>

			{/* Indicador Principal de Potência Instantânea */}
			<div className="flex items-baseline justify-between rounded-lg border border-border-subtle bg-popover p-3.5">
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
				<div className="flex h-2 w-full overflow-hidden rounded-full bg-muted border border-border-subtle">
					<div
						className={cn("h-full transition-all", CATEGORY_FILL_CLASS.climate)}
						style={{ width: "45%" }}
					/>
					<div
						className={cn(
							"h-full transition-all",
							CATEGORY_FILL_CLASS.lighting,
						)}
						style={{ width: "25%" }}
					/>
					<div
						className="h-full bg-muted-foreground transition-all"
						style={{ width: "15%" }}
					/>
				</div>
				<div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
					<span className="flex items-center gap-1">
						<span
							className={cn(
								"h-1.5 w-1.5 rounded-full",
								CATEGORY_FILL_CLASS.climate,
							)}
						/>
						Clima 210W
					</span>
					<span className="flex items-center gap-1">
						<span
							className={cn(
								"h-1.5 w-1.5 rounded-full",
								CATEGORY_FILL_CLASS.lighting,
							)}
						/>
						Luzes 115W
					</span>
					<span className="flex items-center gap-1">
						<span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
						Outros 140W
					</span>
				</div>
			</div>
		</section>
	);
}
