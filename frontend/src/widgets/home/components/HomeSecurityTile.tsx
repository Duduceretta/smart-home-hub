import { Lock, Moon, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/core/utils";

export type SecurityMode = "disarmed" | "home" | "night" | "away";

/**
 * Bento Tile: Perímetro de Segurança e Alarme Residencial.
 *
 * Permite armar e desarmar modos de segurança em 1 toque:
 * - Desarmado
 * - Casa (sensores perimétricos ativos)
 * - Noite (sensores externos + trancas automáticas)
 *
 * Exibe contagem de trancas e status do perímetro.
 */
export function HomeSecurityTile() {
	const [mode, setMode] = useState<SecurityMode>("home");

	const handleModeChange = (newMode: SecurityMode) => {
		setMode(newMode);
		const labels: Record<SecurityMode, string> = {
			disarmed: "Sistema de alarme desarmado",
			home: "Modo Casa ativado: perímetro externo protegido",
			night: "Modo Noturno ativado: trancas e sensores armados",
			away: "Modo Ausente ativado: vigilância total",
		};
		toast.success(labels[newMode]);
	};

	const isArmed = mode !== "disarmed";

	return (
		<section className="flex h-full flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-card p-4 sm:p-5 shadow-2xs">
			{/* Topo: Título e Status */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-popover">
						{isArmed ? (
							<ShieldCheck className="h-3.5 w-3.5 text-success" />
						) : (
							<ShieldAlert className="h-3.5 w-3.5 text-warning" />
						)}
					</div>
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Segurança & Alarme
					</h2>
				</div>
				<span
					className={cn(
						"rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
						isArmed
							? "border border-success/30 bg-success/15 text-success"
							: "border border-warning/30 bg-warning/15 text-warning",
					)}
				>
					{mode === "disarmed"
						? "Desarmado"
						: mode === "night"
							? "Modo Noite"
							: "Armado"}
				</span>
			</div>

			{/* Status central das trancas */}
			<div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-popover p-3">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-highest text-muted-foreground border border-border-subtle">
					<Lock className="h-4 w-4" />
				</div>
				<div className="flex flex-col">
					<span className="text-xs font-semibold text-foreground">
						Trancas & Perímetro
					</span>
					<span className="text-xs text-muted-foreground">
						Fechaduras trancadas • Sensores ativos
					</span>
				</div>
			</div>

			{/* Controles Táteis de 1 toque */}
			<div className="grid grid-cols-3 gap-2">
				<button
					type="button"
					onClick={() => handleModeChange("disarmed")}
					className={cn(
						"flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-all cursor-pointer",
						mode === "disarmed"
							? "border-warning/40 bg-warning/15 text-warning font-semibold"
							: "border-border-subtle bg-popover text-muted-foreground hover:bg-surface-highest hover:text-foreground",
					)}
				>
					<Shield className="h-4 w-4" />
					<span className="text-xs uppercase tracking-wider">Desarmar</span>
				</button>

				<button
					type="button"
					onClick={() => handleModeChange("home")}
					className={cn(
						"flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-all cursor-pointer",
						mode === "home"
							? "border-primary/40 bg-primary/15 text-primary font-semibold"
							: "border-border-subtle bg-popover text-muted-foreground hover:bg-surface-highest hover:text-foreground",
					)}
				>
					<ShieldCheck className="h-4 w-4" />
					<span className="text-xs uppercase tracking-wider">Casa</span>
				</button>

				<button
					type="button"
					onClick={() => handleModeChange("night")}
					className={cn(
						"flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-all cursor-pointer",
						mode === "night"
							? "border-info/40 bg-info/15 text-info font-semibold"
							: "border-border-subtle bg-popover text-muted-foreground hover:bg-surface-highest hover:text-foreground",
					)}
				>
					<Moon className="h-4 w-4" />
					<span className="text-xs uppercase tracking-wider">Noite</span>
				</button>
			</div>
		</section>
	);
}
