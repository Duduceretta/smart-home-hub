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
			<div className="rounded-xl border border-border-subtle/30 bg-surface-high p-4 flex flex-col items-center gap-4 text-center">
				<div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
					<Disc3 className="w-5 h-5" />
				</div>
				<div>
					<p className="text-sm font-medium text-foreground">
						Spotify desconectado
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Conecte sua conta pra controlar a reprodução por aqui.
					</p>
				</div>
				<button
					type="button"
					disabled={isConnecting}
					onClick={() => connectSpotify()}
					className="rounded-full bg-[#1DB954]/15 h-8 px-4 text-xs font-medium text-[#1DB954] transition-colors hover:bg-[#1DB954]/25 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					Conectar Spotify
				</button>
			</div>
		);
	}

	if (!playback?.title) {
		return (
			<div className="rounded-xl border border-border-subtle/30 bg-surface-high p-4 flex flex-col items-center gap-2 text-center">
				<div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-muted-foreground">
					<Disc3 className="w-5 h-5" />
				</div>
				<p className="text-sm font-medium text-foreground">
					Nada tocando no momento
				</p>
				<p className="text-xs text-muted-foreground">
					Toque algo no Spotify pra ver aqui.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border-subtle/30 bg-surface-high p-4 flex flex-col gap-4">
			<div className="flex items-center gap-4">
				<div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
					{playback.albumCoverUrl ? (
						<img
							src={playback.albumCoverUrl}
							alt={playback.title}
							className="h-full w-full object-cover"
						/>
					) : (
						<Disc3 className="w-6 h-6 text-zinc-300 opacity-60" />
					)}
				</div>
				<div className="flex flex-col flex-1 min-w-0">
					<span className="text-sm font-medium text-foreground truncate">
						{playback.title}
					</span>
					<span className="text-xs text-muted-foreground truncate">
						{playback.artist}
					</span>
					{playback.deviceName && (
						<span className="text-xs text-muted-foreground/60 truncate mt-0.5">
							Reproduzindo em {playback.deviceName}
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center justify-center gap-4">
				<button
					type="button"
					aria-label="Faixa anterior"
					disabled={isSkippingPrevious}
					onClick={() => skipPrevious()}
					className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					<SkipBack className="w-4 h-4" />
				</button>
				<button
					type="button"
					aria-label={playback.isPlaying ? "Pausar" : "Reproduzir"}
					disabled={isToggling}
					onClick={() => togglePlayback()}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954] transition-colors hover:bg-[#1DB954]/25 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					{playback.isPlaying ? (
						<Pause className="w-4 h-4 fill-current" />
					) : (
						<Play className="w-4 h-4 fill-current ml-0.5" />
					)}
				</button>
				<button
					type="button"
					aria-label="Próxima faixa"
					disabled={isSkippingNext}
					onClick={() => skipNext()}
					className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
				>
					<SkipForward className="w-4 h-4" />
				</button>
			</div>

			<div className="flex items-center gap-2">
				<Volume2 className="w-4 h-4 text-muted-foreground" />
				<button
					type="button"
					aria-label="Volume"
					className="relative z-20 block flex-1 h-1.5 rounded-full bg-[#0e0e0f] overflow-visible cursor-pointer group/slider touch-none"
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
						className={`h-full bg-[#1DB954] rounded-full relative ${isDragging ? "" : "transition-all"}`}
						style={{ width: `${localVolume}%` }}
					>
						<div
							className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0a3d1c] rounded-full shadow-sm transition-opacity ${
								isDragging
									? "opacity-100"
									: "opacity-0 group-hover/slider:opacity-100"
							}`}
						/>
					</div>
				</button>
			</div>
		</div>
	);
};
