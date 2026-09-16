import { Maximize2, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Bento Tile: Monitor de Vídeo & Câmera do Perímetro.
 *
 * Exibe feed de vídeo ao vivo da entrada principal com marcação
 * de timestamp em tempo real e detecção de presença.
 */
export function HomeCameraTile() {
	const [timeString, setTimeString] = useState("");

	useEffect(() => {
		const updateTime = () => {
			const now = new Date();
			setTimeString(now.toLocaleTimeString("pt-BR"));
		};
		updateTime();
		const timer = setInterval(updateTime, 1000);
		return () => clearInterval(timer);
	}, []);

	const handleSnapshot = () => {
		toast.info("Instantâneo da câmera salvo no histórico de eventos.");
	};

	return (
		<section className="flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-surface-low p-4 sm:p-5 shadow-2xs transition-all hover:border-cool/30 hover:shadow-lg hover:shadow-cool/5">
			{/* Topo */}
			<div className="flex items-center justify-between pb-2">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cool/10">
						<Video className="h-3.5 w-3.5 text-cool" />
					</div>
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Câmera Entrada
					</h2>
				</div>
				<div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
					<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
					<span className="font-mono text-xs font-semibold tracking-wider text-emerald-400">
						LIVE
					</span>
				</div>
			</div>

			{/* Feed de Vídeo Simulado com Scanlines e Detalhes */}
			<div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-container">
				{/* Scanline overlay */}
				<div
					className="pointer-events-none absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							"repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px)",
					}}
				/>

				{/* Câmera Mock Ilustrada */}
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
					<Video className="h-8 w-8" />
					<span className="text-xs font-mono">CAM-01 • PORTÃO SOCIAL</span>
				</div>

				{/* Timestamp HUD no canto superior direito */}
				<div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-xs text-white/90 backdrop-blur-xs">
					{timeString}
				</div>

				{/* Status de Movimento no canto inferior esquerdo */}
				<div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-xs text-white/90 backdrop-blur-xs">
					<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
					<span>Sem movimento recente</span>
				</div>

				{/* Botão de Expandir / Snapshot */}
				<button
					type="button"
					onClick={handleSnapshot}
					className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white/80 transition-colors hover:bg-black/80 hover:text-white cursor-pointer"
					aria-label="Expandir câmera"
				>
					<Maximize2 className="h-3 w-3" />
				</button>
			</div>

			<div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
				<span>Reconhecimento facial ativo</span>
				<span className="font-mono text-xs">1080p • 30fps</span>
			</div>
		</section>
	);
}
