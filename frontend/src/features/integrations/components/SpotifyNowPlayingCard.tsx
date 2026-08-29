import {
	Disc3,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { cn } from "@/core/utils";
import { useConnectSpotify } from "../hooks/useConnectSpotify";
import { useSetSpotifyVolume } from "../hooks/useSetSpotifyVolume";
import {
	useSkipToNextSpotifyTrack,
	useSkipToPreviousSpotifyTrack,
} from "../hooks/useSkipSpotifyTrack";
import { useSpotifyPlayback } from "../hooks/useSpotifyPlayback";
import { useSpotifyStatus } from "../hooks/useSpotifyStatus";
import { useToggleSpotifyPlayback } from "../hooks/useToggleSpotifyPlayback";

export const SpotifyNowPlayingCard: React.FC = () => {
	const { data: status } = useSpotifyStatus();
	const { data: playback } = useSpotifyPlayback({
		enabled: Boolean(status?.connected),
	});
	const { mutate: setVolume } = useSetSpotifyVolume();
	const { mutate: togglePlayback, isPending: isToggling } =
		useToggleSpotifyPlayback();
	const { mutate: skipNext, isPending: isSkippingNext } =
		useSkipToNextSpotifyTrack();
	const { mutate: skipPrevious, isPending: isSkippingPrevious } =
		useSkipToPreviousSpotifyTrack();
	const { mutate: connectSpotify, isPending: isConnecting } =
		useConnectSpotify();

	const [localVolume, setLocalVolume] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	// Só true entre um arraste do usuário e o envio debounced correspondente —
	// evita que a sincronização vinda do servidor (abaixo) seja confundida com
	// uma mudança do usuário e dispare um envio espúrio ao montar o card com
	// dados já em cache (ex: voltando do Dashboard pra Devices).
	const userDraggedVolumeRef = useRef(false);

	useEffect(() => {
		if (playback && !isDragging) {
			setLocalVolume(playback.volumePercent);
		}
	}, [playback, isDragging]);

	const debouncedVolume = useDebouncedValue(localVolume, 300);

	useEffect(() => {
		if (userDraggedVolumeRef.current) {
			userDraggedVolumeRef.current = false;
			setVolume(debouncedVolume);
		}
	}, [debouncedVolume, setVolume]);

	if (!status?.connected) {
		return (
			<div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 text-center transition-all duration-200 hover:border-border">
				<div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
					<Disc3 className="h-5 w-5" />
				</div>
				<div>
					<p className="text-sm font-semibold text-foreground">
						Spotify desconectado
					</p>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Conecte sua conta pra controlar a reprodução por aqui.
					</p>
				</div>
				<button
					type="button"
					disabled={isConnecting}
					onClick={() => connectSpotify()}
					className="inline-flex h-8 items-center rounded-full bg-[#1DB954] px-4 text-xs font-bold text-black shadow-xs transition-colors hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					Conectar Spotify
				</button>
			</div>
		);
	}

	if (!playback?.title) {
		return (
			<div className="flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-surface-container p-4 text-center transition-all duration-200 hover:border-border">
				<div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
					<Disc3 className="h-5 w-5" />
				</div>
				<p className="text-sm font-semibold text-foreground">
					Nada tocando no momento
				</p>
				<p className="text-xs text-muted-foreground">
					Toque algo no Spotify pra ver aqui.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:border-border">
			{/* Faixa e Capa */}
			<div className="flex items-center gap-3.5">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface-low">
					{playback.albumCoverUrl ? (
						<img
							src={playback.albumCoverUrl}
							alt={playback.title}
							className="h-full w-full object-cover"
						/>
					) : (
						<Disc3 className="h-6 w-6 text-muted-foreground/60" />
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-semibold text-foreground">
						{playback.title}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{playback.artist}
					</span>
					{playback.deviceName && (
						<span className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
							Reproduzindo em {playback.deviceName}
						</span>
					)}
				</div>
			</div>

			{/* Controles de Reprodução */}
			<div className="flex items-center justify-center gap-3">
				<button
					type="button"
					aria-label="Faixa anterior"
					disabled={isSkippingPrevious}
					onClick={() => skipPrevious()}
					className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					<SkipBack className="h-4 w-4" />
				</button>
				<button
					type="button"
					aria-label={playback.isPlaying ? "Pausar" : "Reproduzir"}
					disabled={isToggling}
					onClick={() => togglePlayback()}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-xs transition-colors hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					{playback.isPlaying ? (
						<Pause className="h-4 w-4 fill-current" />
					) : (
						<Play className="ml-0.5 h-4 w-4 fill-current" />
					)}
				</button>
				<button
					type="button"
					aria-label="Próxima faixa"
					disabled={isSkippingNext}
					onClick={() => skipNext()}
					className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					<SkipForward className="h-4 w-4" />
				</button>
			</div>

			{/* Barra de Volume */}
			<div className="flex items-center gap-2.5 px-1">
				<Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				<button
					type="button"
					aria-label="Volume"
					className="group/slider relative z-20 block h-1.5 flex-1 rounded-full bg-surface-low overflow-visible cursor-pointer touch-none"
					onPointerDown={(e) => {
						e.currentTarget.setPointerCapture(e.pointerId);
						setIsDragging(true);
						const rect = e.currentTarget.getBoundingClientRect();
						const pct = Math.round(
							((e.clientX - rect.left) / rect.width) * 100,
						);
						userDraggedVolumeRef.current = true;
						setLocalVolume(Math.max(0, Math.min(100, pct)));
					}}
					onPointerMove={(e) => {
						if (e.buttons !== 1) return;
						const rect = e.currentTarget.getBoundingClientRect();
						const pct = Math.round(
							((e.clientX - rect.left) / rect.width) * 100,
						);
						userDraggedVolumeRef.current = true;
						setLocalVolume(Math.max(0, Math.min(100, pct)));
					}}
					onPointerUp={(e) => {
						if (e.currentTarget.hasPointerCapture(e.pointerId)) {
							e.currentTarget.releasePointerCapture(e.pointerId);
						}
						setIsDragging(false);
					}}
				>
					<div
						className={cn(
							"relative h-full rounded-full bg-[#1DB954]",
							!isDragging && "transition-all",
						)}
						style={{ width: `${localVolume}%` }}
					>
						<div
							className={cn(
								"absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-xs transition-opacity",
								isDragging
									? "opacity-100"
									: "opacity-0 group-hover/slider:opacity-100",
							)}
						/>
					</div>
				</button>
			</div>
		</div>
	);
};
