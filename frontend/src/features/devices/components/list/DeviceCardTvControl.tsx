import {
	Disc3,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Volume2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Device } from "@/features/devices/types/devices.types";
import { useDeviceCardVolume } from "../../hooks/useDeviceCardVolume";

interface DeviceCardTvControlProps {
	device: Device;
}

export function DeviceCardTvControl({ device }: DeviceCardTvControlProps) {
	const { t } = useTranslation("devices");
	const isOnline = device.isOnline;

	const {
		localVolume,
		setLocalVolume,
		isDraggingVolume,
		setIsDraggingVolume,
		userDraggedVolumeRef,
		volumeDisabled,
		isAdbControllable,
		media,
		isPlaying,
	} = useDeviceCardVolume(device);

	const hasMedia = isOnline && isAdbControllable && Boolean(media?.title);

	return (
		<div className="flex-1 flex flex-col justify-end gap-4 mt-3">
			<div className="flex items-center gap-4 bg-surface-low rounded-lg p-2 border border-border-subtle">
				<div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
					<div className="w-full h-full bg-linear-to-tr from-indigo-950 to-zinc-800 flex items-center justify-center">
						<Disc3 className="w-5 h-5 text-muted-foreground opacity-60" />
					</div>
				</div>
				<div className="flex flex-col flex-1 min-w-0">
					<span className="text-xs font-semibold text-foreground truncate">
						{hasMedia ? media?.title : t("card.noPlayback", "Sem Reprodução")}
					</span>
					<span className="text-xs text-muted-foreground truncate">
						{!isOnline
							? t("card.deviceOffline", "Dispositivo offline")
							: hasMedia
								? media?.artist
								: undefined}
					</span>
				</div>
				<div className="flex items-center gap-1 relative z-20">
					<button
						type="button"
						disabled
						className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<SkipBack className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						disabled
						className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
					>
						{isPlaying ? (
							<Pause className="w-4 h-4 fill-current" />
						) : (
							<Play className="w-4 h-4 fill-current ml-0.5" />
						)}
					</button>
					<button
						type="button"
						disabled
						className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<SkipForward className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2 relative z-20">
				<Volume2 className="w-4 h-4 text-muted-foreground" />
				<button
					type="button"
					disabled={volumeDisabled}
					aria-label={t("card.volume", "Volume")}
					className="relative z-20 block flex-1 h-1.5 rounded-full bg-surface-low overflow-visible cursor-pointer group/slider disabled:cursor-not-allowed touch-none"
					onPointerDown={(e) => {
						e.stopPropagation();
						if (volumeDisabled) return;
						e.currentTarget.setPointerCapture(e.pointerId);
						setIsDraggingVolume(true);
						const rect = e.currentTarget.getBoundingClientRect();
						const pct = Math.round(
							((e.clientX - rect.left) / rect.width) * 100,
						);
						userDraggedVolumeRef.current = true;
						setLocalVolume(Math.max(0, Math.min(100, pct)));
					}}
					onPointerMove={(e) => {
						if (volumeDisabled || e.buttons !== 1) return;
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
						setIsDraggingVolume(false);
					}}
				>
					<div
						className={`h-full bg-primary rounded-full relative ${isDraggingVolume ? "" : "transition-all"}`}
						style={{ width: `${volumeDisabled ? 0 : localVolume}%` }}
					>
						<div
							className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-foreground rounded-full shadow-sm transition-opacity ${
								isDraggingVolume
									? "opacity-100"
									: "opacity-0 group-hover/slider:opacity-100"
							}`}
						/>
					</div>
				</button>
			</div>
		</div>
	);
}
