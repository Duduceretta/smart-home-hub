import {
	Disc3,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useDeviceMedia } from "../../../hooks/useDeviceMedia";
import { useSetDeviceVolume } from "../../../hooks/useSetDeviceVolume";
import { useToggleDevice } from "../../../hooks/useToggleDevice";
import {
	IntegrationTypeEnum,
	isActuatorDevice,
} from "../../../types/devices.types";
import type { DeviceControlPanelProps } from "./device-control-panel.types";

/**
 * Controles de Smart TV/Cast — now-playing + play/pause/skip (visual, ainda
 * `disabled`: não existe comando real de mídia no back-end, mesmo estado de
 * "fora de escopo" já documentado no `DeviceCard.tsx` original) + volume
 * real via ADB. Migrado do bloco `isTv` de `DeviceCard.tsx` (removido), não
 * duplicado.
 */
export function TvControlPanel({ device }: DeviceControlPanelProps) {
	const { t } = useTranslation("devices");
	const isOnline = device.isOnline;

	// Volume/mídia real via ADB — só suportado por TVs GoogleCast/AndroidTvAdb
	// (LgWebOs usa protocolo WebOS SSAP, fora de escopo).
	const isAdbControllable =
		device.integrationType === IntegrationTypeEnum.GoogleCast ||
		device.integrationType === IntegrationTypeEnum.AndroidTvAdb;

	const { data: media } = useDeviceMedia(device.id, {
		enabled: isAdbControllable && isOnline,
	});
	const isPlaying = Boolean(media?.isPlaying);
	const { mutate: setVolume } = useSetDeviceVolume();

	const [localVolume, setLocalVolume] = useState(0);
	const [isDraggingVolume, setIsDraggingVolume] = useState(false);
	const userDraggedVolumeRef = useRef(false);

	useEffect(() => {
		if (media && !isDraggingVolume) {
			setLocalVolume(media.volumePercent);
		}
	}, [media, isDraggingVolume]);

	const debouncedVolume = useDebouncedValue(localVolume, 300);

	useEffect(() => {
		if (isAdbControllable && userDraggedVolumeRef.current) {
			userDraggedVolumeRef.current = false;
			setVolume({ deviceId: device.id, volume: debouncedVolume });
		}
	}, [debouncedVolume, isAdbControllable, device.id, setVolume]);

	const hasMedia = isOnline && isAdbControllable && Boolean(media?.title);
	const volumeDisabled = !isOnline || !isAdbControllable;
	const showToggle = isActuatorDevice(device.type);

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-container p-4">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{t("controls.title", "Controles")}
			</h3>

			<div className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-high p-2">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-highest">
					<div className="flex h-full w-full items-center justify-center bg-linear-to-tr from-indigo-950 to-zinc-800">
						<Disc3 className="h-5 w-5 text-zinc-300 opacity-60" />
					</div>
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-xs font-semibold text-foreground">
						{hasMedia ? media?.title : t("card.noPlayback", "Sem Reprodução")}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{!isOnline
							? t("card.deviceOffline", "Dispositivo offline")
							: hasMedia
								? media?.artist
								: undefined}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						disabled
						className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-highest text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<SkipBack className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						disabled
						className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
					>
						{isPlaying ? (
							<Pause className="h-4 w-4 fill-current" />
						) : (
							<Play className="ml-0.5 h-4 w-4 fill-current" />
						)}
					</button>
					<button
						type="button"
						disabled
						className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-highest text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<SkipForward className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Volume2 className="h-4 w-4 text-muted-foreground" />
				<button
					type="button"
					disabled={volumeDisabled}
					aria-label={t("controls.volume", "Volume")}
					className="relative block h-1.5 flex-1 touch-none overflow-visible rounded-full bg-surface-low cursor-pointer group/slider disabled:cursor-not-allowed"
					onPointerDown={(e) => {
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
						className={`h-full rounded-full bg-primary relative ${isDraggingVolume ? "" : "transition-all"}`}
						style={{ width: `${volumeDisabled ? 0 : localVolume}%` }}
					>
						<div
							className={`absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary-foreground shadow-sm transition-opacity ${
								isDraggingVolume
									? "opacity-100"
									: "opacity-0 group-hover/slider:opacity-100"
							}`}
						/>
					</div>
				</button>
			</div>

			{showToggle && (
				<TvPowerToggle
					deviceId={device.id}
					isOn={device.isOn}
					isOnline={isOnline}
				/>
			)}
		</div>
	);
}

interface TvPowerToggleProps {
	deviceId: string;
	isOn: boolean;
	isOnline: boolean;
}

function TvPowerToggle({ deviceId, isOn, isOnline }: TvPowerToggleProps) {
	const { t } = useTranslation("devices");
	const { mutate: toggleDevice, isPending } = useToggleDevice();

	return (
		<button
			type="button"
			role="switch"
			aria-checked={isOn && isOnline}
			disabled={!isOnline || isPending}
			onClick={() => toggleDevice(deviceId)}
			className={`self-start rounded-full px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed ${
				isOn && isOnline
					? "bg-primary text-primary-foreground"
					: "border border-border-subtle bg-surface-high text-muted-foreground hover:bg-surface-highest"
			}`}
		>
			{isOn && isOnline
				? t("common:status.on", "LIGADO")
				: t("common:status.off", "DESLIGADO")}
		</button>
	);
}
