import { Plus } from "lucide-react";
import { useToggleRoomDevice } from "../hooks/useToggleRoomDevice";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import type { RoomPickerDevice } from "../types/room-devices.types";
import type { Room } from "../types/rooms.types";
import { RoomDeviceCard } from "./RoomDeviceCard";

interface RoomDeviceGridProps {
	room: Room;
	devices: RoomPickerDevice[];
}

/**
 * Grid de dispositivos do ambiente — extraído do `RoomDetailPanel` pra
 * viver na coluna primária do `RoomDetailContent`. Mesmo comportamento de
 * antes (toggle inline via `useToggleRoomDevice`, botão de adicionar
 * dispositivo abrindo o `RoomFormDialog` focado na seção de dispositivos).
 */
export function RoomDeviceGrid({ room, devices }: RoomDeviceGridProps) {
	const openEditDialog = useRoomsUIStore((s) => s.openEditDialog);
	const toggleDevice = useToggleRoomDevice();

	return (
		<div className="flex flex-col gap-3">
			{devices.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border-subtle/40 p-6 text-center text-sm text-muted-foreground">
					Nenhum dispositivo neste ambiente ainda.
				</p>
			) : (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
					{devices.map((device) => (
						<RoomDeviceCard
							key={device.id}
							device={device}
							isToggling={
								toggleDevice.isPending && toggleDevice.variables === device.id
							}
							onToggle={(deviceId) => toggleDevice.mutate(deviceId)}
						/>
					))}
				</div>
			)}

			<button
				type="button"
				onClick={() => openEditDialog(room, { focusDevices: true })}
				className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle/40 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
			>
				<Plus className="h-4 w-4" />
				Adicionar Dispositivo a este Ambiente
			</button>
		</div>
	);
}
