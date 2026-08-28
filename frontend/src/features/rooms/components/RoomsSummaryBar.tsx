import { cn } from "@/core/utils";
import type { RoomPickerDevice } from "../types/room-devices.types";
import type { Room } from "../types/rooms.types";

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
	const assignedDevices = devices.filter((device) => device.roomId);
	const offlineCount = assignedDevices.filter(
		(device) => !device.isOnline,
	).length;

	return (
		<div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
			<span>
				<span className="font-medium text-foreground">{rooms.length}</span>{" "}
				ambiente{rooms.length === 1 ? "" : "s"}
			</span>
			<span className="text-border-subtle">·</span>
			<span>
				<span className="font-medium text-foreground">
					{assignedDevices.length}
				</span>{" "}
				dispositivo{assignedDevices.length === 1 ? "" : "s"}
			</span>
			<span className="text-border-subtle">·</span>
			<span>
				<span
					className={cn(
						"font-medium",
						offlineCount > 0 ? "text-alert-foreground" : "text-foreground",
					)}
				>
					{offlineCount}
				</span>{" "}
				offline
			</span>
		</div>
	);
}
