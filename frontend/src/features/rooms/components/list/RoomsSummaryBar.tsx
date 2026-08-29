import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import type { Room, RoomPickerDevice } from "../../types/rooms.types";

interface RoomsSummaryBarProps {
	rooms: Room[];
	devices: RoomPickerDevice[];
}

/**
 * Faixa de contexto rápido — mesmo padrão de uma linha, densidade sobre
 * respiro, já usado em `AutomationSummaryBar`. "Dispositivos"/"offline"
 * contam só dispositivos com `roomId` atribuído (não o total da casa).
 */
export function RoomsSummaryBar({ rooms, devices }: RoomsSummaryBarProps) {
	const { t } = useTranslation("rooms");
	const assignedDevices = devices.filter((device) => device.roomId);
	const offlineCount = assignedDevices.filter(
		(device) => !device.isOnline,
	).length;

	return (
		<div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
			<span>
				<span className="font-semibold text-foreground">{rooms.length}</span>{" "}
				{t("summaryBar.room", "ambiente", { count: rooms.length })}
			</span>
			<span className="text-border">·</span>
			<span>
				<span className="font-semibold text-foreground">
					{assignedDevices.length}
				</span>{" "}
				{t("summaryBar.device", "dispositivo", {
					count: assignedDevices.length,
				})}
			</span>
			<span className="text-border">·</span>
			<span>
				<span
					className={cn(
						"font-semibold transition-colors",
						offlineCount > 0 ? "text-destructive" : "text-foreground",
					)}
				>
					{offlineCount}
				</span>{" "}
				{t("summaryBar.offline", "offline")}
			</span>
		</div>
	);
}
