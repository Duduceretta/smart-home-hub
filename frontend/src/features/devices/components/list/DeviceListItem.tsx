import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { DEVICE_CONFIG } from "../../constants/devices.constants";
import { useToggleDevice } from "../../hooks/useToggleDevice";
import type { ViewModeType } from "../../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	isActuatorDevice,
} from "../../types/devices.types";

interface DeviceListItemProps {
	device: Device;
	isSelected: boolean;
	onSelect: (id: string) => void;
	viewMode: ViewModeType;
}

/**
 * Item da lista de dispositivos — mesmo padrão de `RoomListItem` (feature
 * `rooms`). Toggle compacto inline liga/desliga em 1 clique sem abrir o
 * detalhe (`stopPropagation`); clicar no resto do item seleciona pro
 * painel de detalhe. Editar/excluir ficam só no `DeviceDetailPanel`, não
 * duplicados aqui.
 */
export function DeviceListItem({
	device,
	isSelected,
	onSelect,
	viewMode,
}: DeviceListItemProps) {
	const { t } = useTranslation(["devices", "common"]);
	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const Icon = config.icon;
	const showToggle = isActuatorDevice(device.type);
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;
	const isToggleDisabled = !isOnline || isToggling;

	const handleToggle = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (isToggleDisabled) return;
		toggleDevice(device.id);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: item de seleção de uma lista custom (não um form), precisa de role="button" pra teclado
		<div
			role="button"
			tabIndex={0}
			data-device-item
			onClick={() => onSelect(device.id)}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onSelect(device.id);
			}}
			aria-current={isSelected}
			className={cn(
				"group flex w-full items-center gap-3 rounded-lg border text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				viewMode === "grid" ? "p-3" : "px-3 py-2",
				isSelected
					? "border-primary/40 bg-primary/10 shadow-xs"
					: "border-transparent bg-surface-container/60 hover:bg-surface-high hover:border-border-subtle/50",
				!isOnline && "opacity-70",
			)}
		>
			{showToggle ? (
				<button
					type="button"
					role="switch"
					aria-checked={isOn}
					aria-label={t("card.toggleAriaLabel", { name: device.name })}
					disabled={isToggleDisabled}
					onClick={handleToggle}
					className={cn(
						"relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
						viewMode === "grid" ? "h-10 w-10" : "h-8 w-8",
						!isOnline
							? "bg-surface-high border border-border-subtle text-muted-foreground/50 cursor-not-allowed"
							: isOn
								? "bg-primary text-primary-foreground shadow-xs"
								: "bg-surface-high border border-border-subtle text-muted-foreground hover:bg-surface-highest hover:text-foreground",
					)}
				>
					<Icon className={viewMode === "grid" ? "h-5 w-5" : "h-4 w-4"} />
				</button>
			) : (
				<div
					className={cn(
						"flex shrink-0 items-center justify-center rounded-full bg-surface-high text-muted-foreground",
						viewMode === "grid" ? "h-10 w-10" : "h-8 w-8",
					)}
				>
					<Icon className={viewMode === "grid" ? "h-5 w-5" : "h-4 w-4"} />
				</div>
			)}

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className={cn(
						"truncate text-sm transition-colors",
						isSelected
							? "font-semibold text-foreground"
							: "font-medium text-foreground/90 group-hover:text-foreground",
					)}
				>
					{device.name}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{(device.roomId
						? device.room
						: t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])
					).toUpperCase()}
					{" · "}
					{device.brand.toUpperCase()}
				</span>
			</div>

			{!isOnline && (
				<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-alert-foreground">
					<WifiOff className="h-3.5 w-3.5" />
					{viewMode === "grid" && t("common:status.offline", "OFFLINE")}
				</span>
			)}
		</div>
	);
}
