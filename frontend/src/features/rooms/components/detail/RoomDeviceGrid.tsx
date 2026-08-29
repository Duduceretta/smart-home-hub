import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToggleRoomDevice } from "../../hooks/useToggleRoomDevice";
import { useRoomsUIStore } from "../../store/rooms-ui.store";
import type { Room, RoomPickerDevice } from "../../types/rooms.types";
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
	const { t } = useTranslation("rooms");
	const openEditDialog = useRoomsUIStore((s) => s.openEditDialog);
	const toggleDevice = useToggleRoomDevice();

	return (
		<div className="flex flex-col gap-3">
			{devices.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border-subtle bg-surface-container/20 p-6 text-center text-sm text-muted-foreground">
					{t("deviceGrid.empty", "Nenhum dispositivo neste ambiente ainda.")}
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
				className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-surface-container/30 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-surface-container hover:text-foreground cursor-pointer"
			>
				<Plus className="h-4 w-4" />
				{t("deviceGrid.addDevice", "Adicionar Dispositivo a este Ambiente")}
			</button>
		</div>
	);
}
