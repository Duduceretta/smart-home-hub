import type { RoomPickerDevice } from "../types/room-devices.types";
import type { Room } from "../types/rooms.types";
import { RoomActivityFeed } from "./RoomActivityFeed";
import { RoomClimateSection } from "./RoomClimateSection";
import { RoomDeviceGrid } from "./RoomDeviceGrid";
import { RoomEnergyChart } from "./RoomEnergyChart";
import { RoomLinkedAutomations } from "./RoomLinkedAutomations";
import { RoomQuickActions } from "./RoomQuickActions";

interface RoomDetailContentProps {
	room: Room;
	devices: RoomPickerDevice[];
}

/**
 * Corpo do painel de detalhe do ambiente — ações rápidas, clima, grid de
 * dispositivos, consumo de energia, automações vinculadas e atividade
 * recente. Cada seção busca seu próprio dado (loading/erro independentes
 * por seção via TanStack Query) e é dona do seu próprio estado vazio.
 */
export function RoomDetailContent({ room, devices }: RoomDetailContentProps) {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
			<div className="flex flex-col gap-6">
				<RoomQuickActions roomId={room.id} devices={devices} />

				<RoomClimateSection roomId={room.id} />

				<RoomDeviceGrid room={room} devices={devices} />

				<RoomEnergyChart roomId={room.id} />

				<RoomLinkedAutomations roomId={room.id} />

				<RoomActivityFeed roomId={room.id} />
			</div>
		</div>
	);
}
