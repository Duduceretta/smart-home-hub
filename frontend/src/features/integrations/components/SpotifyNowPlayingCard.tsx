import { Disc3, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useSetSpotifyVolume } from "../hooks/useSetSpotifyVolume";
import { useSpotifyPlayback } from "../hooks/useSpotifyPlayback";
import { useSpotifyStatus } from "../hooks/useSpotifyStatus";

export const SpotifyNowPlayingCard: React.FC = () => {
	const { data: status } = useSpotifyStatus();
	const { data: playback } = useSpotifyPlayback({
		enabled: Boolean(status?.connected),
	});
	const { mutate: setVolume } = useSetSpotifyVolume();

	const [localVolume, setLocalVolume] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const lastSentVolumeRef = useRef<number | null>(null);

	useEffect(() => {
		if (playback && !isDragging) {
			setLocalVolume(playback.volumePercent);
			lastSentVolumeRef.current = playback.volumePercent;
		}
	}, [playback, isDragging]);

	const debouncedVolume = useDebouncedValue(localVolume, 300);

	useEffect(() => {
		if (
			lastSentVolumeRef.current !== null &&
			debouncedVolume !== lastSentVolumeRef.current
		) {
			lastSentVolumeRef.current = debouncedVolume;
			setVolume(debouncedVolume);
		}
	}, [debouncedVolume, setVolume]);

	if (!status?.connected || !playback?.title) {
		return null;
	}

	return (
		<div className="rounded-xl border border-[#46464b]/30 bg-linear-to-br from-[#2a2a2a] to-[#232323] p-4 flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<div className="w-12 h-12 rounded-lg bg-[#201f20] flex items-center justify-center overflow-hidden shrink-0">
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
					<span className="text-sm font-semibold text-[#e5e2e2] truncate">
						{playback.title}
					</span>
					<span className="text-xs text-[#c7c6cb] truncate">
						{playback.artist}
					</span>
					{playback.deviceName && (
						<span className="text-[10px] text-[#8a898f] truncate mt-0.5">
							Reproduzindo em {playback.deviceName}
						</span>
					)}
				</div>
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
					{playback.isPlaying ? (
						<Pause className="w-4 h-4 fill-current" />
					) : (
						<Play className="w-4 h-4 fill-current ml-0.5" />
					)}
				</span>
			</div>

			<div className="flex items-center gap-2">
				<Volume2 className="w-4 h-4 text-[#c7c6cb]" />
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
						setLocalVolume(Math.max(0, Math.min(100, pct)));
					}}
					onPointerMove={(e) => {
						if (e.buttons !== 1) return;
						const rect = e.currentTarget.getBoundingClientRect();
						const pct = Math.round(
							((e.clientX - rect.left) / rect.width) * 100,
						);
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
