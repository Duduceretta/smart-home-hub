import { useTranslation } from "react-i18next";
import type { Device } from "@/features/devices/types/devices.types";

interface DeviceCardSocketControlProps {
	device: Device;
}

export function DeviceCardSocketControl({
	device,
}: DeviceCardSocketControlProps) {
	const { t } = useTranslation("devices");
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	return (
		<div className="flex flex-col gap-2 mt-auto">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">
					{t("card.powerUsage", "Consumo")}
				</span>
				<div className="flex items-baseline gap-1">
					<span className="text-xl font-semibold text-foreground tracking-tight">
						{isOn ? 120 : 0}
					</span>
					<span className="text-xs font-medium text-primary">W</span>
				</div>
			</div>
			<div className="flex items-center justify-between text-xs border-t border-border-subtle/20 pt-2">
				<span className="text-muted-foreground">
					{t("card.voltage", "Tensão")}
				</span>
				<span className="font-semibold text-foreground">127V</span>
			</div>
		</div>
	);
}
