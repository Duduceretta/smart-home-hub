import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { ROOM_DEVICE_ACTUATOR_TYPES } from "../constants/room-device-icons.constants";
import { useSetRoomDevicesPower } from "../hooks/useSetRoomDevicesPower";
import type { RoomPickerDevice } from "../types/room-devices.types";

interface RoomQuickActionsProps {
	roomId: string;
	devices: RoomPickerDevice[];
}

/**
 * "Ligar Tudo"/"Desligar Tudo" — dispara `POST /rooms/{id}/devices/turn-on|
 * turn-off` (SetRoomDevicesPowerCommand.cs), que já resolve no back-end
 * quais dispositivos são elegíveis (atuador, online, fora do estado
 * desejado) e comanda todos em paralelo. O cliente só decide se cada botão
 * fica habilitado, olhando a mesma lista de dispositivos já carregada — sem
 * repetir a lógica de comando aqui.
 */
export function RoomQuickActions({ roomId, devices }: RoomQuickActionsProps) {
	const setPower = useSetRoomDevicesPower(roomId);

	const eligible = devices.filter(
		(device) => device.isOnline && ROOM_DEVICE_ACTUATOR_TYPES.has(device.type),
	);
	const hasDeviceToTurnOn = eligible.some((device) => !device.isOn);
	const hasDeviceToTurnOff = eligible.some((device) => device.isOn);

	const runBulkPower = async (desiredState: boolean, actionLabel: string) => {
		try {
			const result = await setPower.mutateAsync(desiredState);
			if (result.totalCount === 0) return;

			if (result.failedCount > 0) {
				toast.error(
					`${result.succeededCount} de ${result.totalCount} dispositivos ${actionLabel} — ${result.failedCount} falharam.`,
				);
			} else {
				toast.success(
					`${result.succeededCount} dispositivo${result.succeededCount === 1 ? "" : "s"} ${actionLabel}.`,
				);
			}
		} catch {
			// erro já tratado/toastado pelo onError de useSetRoomDevicesPower
		}
	};

	return (
		<div className="flex gap-2">
			<Button
				variant="outline"
				className="flex-1 border-border-subtle/30 bg-surface-container hover:border-primary/40 hover:bg-surface-high"
				disabled={!hasDeviceToTurnOn || setPower.isPending}
				onClick={() => runBulkPower(true, "ligados")}
			>
				<Power className="h-3.5 w-3.5" />
				Ligar Tudo
			</Button>
			<Button
				variant="outline"
				className="flex-1 border-border-subtle/30 bg-surface-container hover:border-primary/40 hover:bg-surface-high"
				disabled={!hasDeviceToTurnOff || setPower.isPending}
				onClick={() => runBulkPower(false, "desligados")}
			>
				<PowerOff className="h-3.5 w-3.5" />
				Desligar Tudo
			</Button>
		</div>
	);
}
