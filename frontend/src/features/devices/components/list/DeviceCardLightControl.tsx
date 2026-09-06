import { useTranslation } from "react-i18next";
import type { Device } from "@/features/devices/types/devices.types";
import { useDeviceCardBrightness } from "../../hooks/useDeviceCardBrightness";

interface DeviceCardLightControlProps {
	device: Device;
}

export function DeviceCardLightControl({
	device,
}: DeviceCardLightControlProps) {
	const { t } = useTranslation("devices");
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	const {
		brightness,
		setBrightness,
		isDraggingBrightness,
		setIsDraggingBrightness,
		commitBrightness,
	} = useDeviceCardBrightness(device);

	return (
		<div className="flex flex-col gap-2 mt-auto pt-2">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>{t("card.brightness", "Brilho")}</span>
				<span className="font-semibold text-foreground">
					{isOn ? `${brightness}%` : "0%"}
				</span>
			</div>
			<button
				type="button"
				disabled={!isOnline}
				aria-label={t("card.brightness", "Brilho")}
				className="relative z-20 block w-full h-2 rounded-full bg-surface-low overflow-visible cursor-pointer group/slider disabled:cursor-not-allowed touch-none"
				onPointerDown={(e) => {
					e.stopPropagation();
					if (!isOnline) return;
					e.currentTarget.setPointerCapture(e.pointerId);
					setIsDraggingBrightness(true);
					const rect = e.currentTarget.getBoundingClientRect();
					const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
					setBrightness(Math.max(0, Math.min(100, pct)));
				}}
				onPointerMove={(e) => {
					if (!isOnline || e.buttons !== 1) return;
					const rect = e.currentTarget.getBoundingClientRect();
					const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
					setBrightness(Math.max(0, Math.min(100, pct)));
				}}
				onPointerUp={(e) => {
					if (e.currentTarget.hasPointerCapture(e.pointerId)) {
						e.currentTarget.releasePointerCapture(e.pointerId);
					}
					setIsDraggingBrightness(false);
					commitBrightness(brightness);
				}}
			>
				<div
					className={`h-full bg-warm rounded-full relative ${isDraggingBrightness ? "" : "transition-all"}`}
					style={{ width: isOn ? `${brightness}%` : "0%" }}
				>
					<div
						className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-warm-foreground rounded-full shadow-sm transition-opacity ${
							isDraggingBrightness
								? "opacity-100"
								: "opacity-0 group-hover/slider:opacity-100"
						}`}
					/>
				</div>
			</button>
		</div>
	);
}
