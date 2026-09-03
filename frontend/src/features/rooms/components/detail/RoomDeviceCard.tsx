import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import {
	ROOM_DEVICE_ACTUATOR_TYPES,
	ROOM_DEVICE_TELEVISION_TYPE,
	ROOM_DEVICE_TYPE_ICON,
} from "../../constants/room-device-icons.constants";
import type { RoomPickerDevice } from "../../types/rooms.types";

interface RoomDeviceCardProps {
	device: RoomPickerDevice;
	roomName?: string;
	/** Este card específico tem um toggle em voo — evita clique duplo
	 * enquanto o servidor não confirma o novo estado (sem isso o usuário
	 * podia clicar de novo antes do POST /toggle voltar e inverter o estado
	 * sem querer). */
	isToggling?: boolean;
	onToggle: (deviceId: string) => void;
}

/**
 * TV usa botão "Controle" (sem estado binário simples — navega pro painel de
 * detalhe do dispositivo em `/devices`, mesmo mecanismo de
 * `DeviceGroupDeviceCard`); atuadores (luz, tomada, ar, fechadura...) usam
 * toggle inline via `POST /devices/{id}/toggle` (o servidor inverte o
 * estado — não precisamos enviar o próximo valor); sensores/câmeras só
 * exibem status.
 */
export function RoomDeviceCard({
	device,
	roomName,
	isToggling = false,
	onToggle,
}: RoomDeviceCardProps) {
	const { t } = useTranslation("rooms");
	const navigate = useNavigate();
	const Icon = ROOM_DEVICE_TYPE_ICON[device.type] ?? ROOM_DEVICE_TYPE_ICON[1];
	const isTv = device.type === ROOM_DEVICE_TELEVISION_TYPE;
	const isToggleable = !isTv && ROOM_DEVICE_ACTUATOR_TYPES.has(device.type);

	const handleNavigateToDevice = () => {
		navigate("/devices", {
			state: {
				selectedDeviceId: device.id,
				returnTo: "/rooms",
				returnLabel: roomName || t("title", "Ambientes"),
			},
		});
	};

	if (!device.isOnline) {
		return (
			<div className="flex items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 transition-colors">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
					<Icon className="h-5 w-5" />
				</div>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span
						title={device.name}
						className="truncate text-sm font-medium text-foreground/80"
					>
						{device.name}
					</span>
					<span className="flex items-center gap-1 text-xs font-medium text-destructive">
						<AlertTriangle className="h-3.5 w-3.5" />
						{t("deviceCard.offline", "Offline")}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-container p-4 transition-all hover:border-border hover:bg-surface-high">
			<div
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
					device.isOn
						? "bg-primary/15 text-primary"
						: "bg-surface-high text-muted-foreground",
				)}
			>
				<Icon className="h-5 w-5" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					title={device.name}
					className="truncate text-sm font-medium text-foreground"
				>
					{device.name}
				</span>
				<span
					className={cn(
						"text-xs font-medium transition-colors",
						device.isOn || !isToggleable
							? "text-primary"
							: "text-muted-foreground",
					)}
				>
					{isTv
						? t("deviceCard.online", "Online")
						: isToggleable
							? device.isOn
								? t("deviceCard.on", "Ligado")
								: t("deviceCard.off", "Desligado")
							: t("deviceCard.online", "Online")}
				</span>
			</div>

			{isTv ? (
				<Button
					variant="outline"
					size="sm"
					onClick={handleNavigateToDevice}
					className="shrink-0 border-border-subtle bg-surface-high hover:bg-surface-highest"
				>
					{t("deviceCard.control", "Controle")}
				</Button>
			) : (
				isToggleable &&
				(isToggling ? (
					<Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
				) : (
					<Switch
						checked={device.isOn}
						onCheckedChange={() => onToggle(device.id)}
						aria-label={
							device.isOn
								? t("deviceCard.toggleAriaOn", `Desligar ${device.name}`, {
										name: device.name,
									})
								: t("deviceCard.toggleAriaOff", `Ligar ${device.name}`, {
										name: device.name,
									})
						}
						className="shrink-0"
					/>
				))
			)}
		</div>
	);
}
