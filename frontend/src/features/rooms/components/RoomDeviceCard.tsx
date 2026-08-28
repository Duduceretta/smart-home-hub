import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import {
	ROOM_DEVICE_ACTUATOR_TYPES,
	ROOM_DEVICE_TELEVISION_TYPE,
	ROOM_DEVICE_TYPE_ICON,
} from "../constants/room-device-icons.constants";
import type { RoomPickerDevice } from "../types/room-devices.types";

interface RoomDeviceCardProps {
	device: RoomPickerDevice;
	/** Este card específico tem um toggle em voo — evita clique duplo
	 * enquanto o servidor não confirma o novo estado (sem isso o usuário
	 * podia clicar de novo antes do POST /toggle voltar e inverter o estado
	 * sem querer). */
	isToggling?: boolean;
	onToggle: (deviceId: string) => void;
}

/**
 * TV usa botão "Controle" (sem estado binário simples); atuadores (luz,
 * tomada, ar, fechadura...) usam toggle inline via `POST /devices/{id}/toggle`
 * (o servidor inverte o estado — não precisamos enviar o próximo valor);
 * sensores/câmeras só exibem status.
 */
export function RoomDeviceCard({
	device,
	isToggling = false,
	onToggle,
}: RoomDeviceCardProps) {
	const Icon = ROOM_DEVICE_TYPE_ICON[device.type] ?? ROOM_DEVICE_TYPE_ICON[1];
	const isTv = device.type === ROOM_DEVICE_TELEVISION_TYPE;
	const isToggleable = !isTv && ROOM_DEVICE_ACTUATOR_TYPES.has(device.type);

	if (!device.isOnline) {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-alert/50 bg-alert/10 p-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-alert/20 text-alert-foreground">
					<Icon className="h-5 w-5" />
				</div>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-medium text-foreground">
						{device.name}
					</span>
					<span className="flex items-center gap-1 text-xs font-medium text-alert-foreground">
						<AlertTriangle className="h-3 w-3" />
						Offline
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3 rounded-lg border border-border-subtle/20 bg-surface-container p-4">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary">
				<Icon className="h-5 w-5" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium text-foreground">
					{device.name}
				</span>
				<span
					className={cn(
						"text-xs",
						device.isOn || !isToggleable
							? "text-primary"
							: "text-muted-foreground",
					)}
				>
					{isTv
						? "Online"
						: isToggleable
							? device.isOn
								? "Ligado"
								: "Desligado"
							: "Online"}
				</span>
			</div>

			{isTv ? (
				<Button variant="outline" size="sm" className="shrink-0">
					Controle
				</Button>
			) : (
				isToggleable &&
				(isToggling ? (
					<Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
				) : (
					<Switch
						checked={device.isOn}
						onCheckedChange={() => onToggle(device.id)}
						aria-label={`${device.isOn ? "Desligar" : "Ligar"} ${device.name}`}
						className="shrink-0"
					/>
				))
			)}
		</div>
	);
}
