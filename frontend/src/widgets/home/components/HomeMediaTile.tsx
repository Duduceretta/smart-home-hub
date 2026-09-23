import {
	Disc3,
	Pause,
	Play,
	Radio,
	SkipBack,
	SkipForward,
	Volume2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/core/utils";
import { CATEGORY_ICON_CLASS } from "../constants/home-categories";

/**
 * Bento Tile: Central de Áudio & Mídia em Tempo Real.
 *
 * Exibe o estado de reprodução atual do ecossistema multimídia
 * com controles instantâneos de play/pause, faixa e volume.
 */
export function HomeMediaTile() {
	const [isPlaying, setIsPlaying] = useState(true);
	const [trackIndex, setTrackIndex] = useState(0);
	const [volume, setVolume] = useState(65);

	const tracks = [
		{
			title: "Midnight City",
			artist: "M83",
			album: "Hurry Up, We're Dreaming",
			room: "Sala de Estar • Spotify Connect",
			duration: "4:03",
		},
		{
			title: "Starboy",
			artist: "The Weeknd, Daft Punk",
			album: "Starboy",
			room: "Quarto Principal • AirPlay 2",
			duration: "3:50",
		},
		{
			title: "Resonance",
			artist: "HOME",
			album: "Odyssey",
			room: "Escritório • Google Cast",
			duration: "3:32",
		},
	];

	const currentTrack = tracks[trackIndex] ?? tracks[0];

	const togglePlay = () => {
		setIsPlaying((prev) => !prev);
		toast.info(
			!isPlaying
				? `Reproduzindo "${currentTrack.title}"`
				: "Reprodução pausada",
		);
	};

	const nextTrack = () => {
		setTrackIndex((prev) => (prev + 1) % tracks.length);
	};

	const prevTrack = () => {
		setTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
	};

	return (
		<section className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border-subtle bg-card p-4 sm:p-5 shadow-2xs">
			{/* Topo: Título e Dispositivo de Saída */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-popover">
						<Radio className="h-3.5 w-3.5 text-muted-foreground" />
					</div>
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Áudio Residencial
					</h2>
				</div>
				<span className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-popover px-2 py-0.5 text-xs font-medium text-muted-foreground">
					<span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
					<span>Cast Ativo</span>
				</span>
			</div>

			{/* Miolo: Capa e Faixa */}
			<div className="flex items-center gap-3.5 rounded-lg border border-border-subtle bg-popover p-3">
				<div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted border border-border-subtle overflow-hidden shadow-2xs">
					<Disc3
						className={cn(
							"h-6 w-6 transition-transform",
							CATEGORY_ICON_CLASS.media,
							isPlaying && "animate-spin [animation-duration:4s]",
						)}
					/>
				</div>

				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-semibold text-foreground">
						{currentTrack.title}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{currentTrack.artist}
					</span>
					<span className="truncate text-xs text-muted-foreground font-medium mt-0.5">
						{currentTrack.room}
					</span>
				</div>
			</div>

			{/* Controles de Reprodução */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={prevTrack}
						className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-popover text-muted-foreground transition-colors hover:bg-surface-highest hover:text-foreground cursor-pointer"
						aria-label="Faixa anterior"
					>
						<SkipBack className="h-3.5 w-3.5" />
					</button>

					<button
						type="button"
						onClick={togglePlay}
						className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/15 text-primary transition-colors hover:bg-primary/25 cursor-pointer"
						aria-label={isPlaying ? "Pausar" : "Reproduzir"}
					>
						{isPlaying ? (
							<Pause className="h-4 w-4" />
						) : (
							<Play className="h-4 w-4 fill-current ml-0.5" />
						)}
					</button>

					<button
						type="button"
						onClick={nextTrack}
						className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-popover text-muted-foreground transition-colors hover:bg-surface-highest hover:text-foreground cursor-pointer"
						aria-label="Próxima faixa"
					>
						<SkipForward className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* Slider rápido de volume */}
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Volume2 className="h-3.5 w-3.5 shrink-0" />
					<input
						type="range"
						min="0"
						max="100"
						value={volume}
						onChange={(e) => setVolume(Number(e.target.value))}
						className="h-1.5 w-16 sm:w-20 cursor-pointer accent-primary"
						aria-label="Volume"
					/>
					<span className="w-6 text-right font-mono text-xs">{volume}%</span>
				</div>
			</div>
		</section>
	);
}
