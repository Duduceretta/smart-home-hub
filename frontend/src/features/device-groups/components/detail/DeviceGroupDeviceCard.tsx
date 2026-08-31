import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import {
	GROUP_DEVICE_ACTUATOR_TYPES,
	GROUP_DEVICE_TELEVISION_TYPE,
	GROUP_DEVICE_TYPE_ICON,
} from "../../constants/device-groups.constants";
import type { DeviceInGroup } from "../../types/device-groups.types";

interface DeviceGroupDeviceCardProps {
	device: DeviceInGroup;
	groupName?: string;
	isToggling?: boolean;
	onToggle: (deviceId: string) => void;
}

/**
 * Individual device card inside a DeviceGroup's detail grid, aligned with `RoomDeviceCard`.
 * Supports offline alerts, inline switch toggles, and direct navigation to the Devices detail panel.
 */
export function DeviceGroupDeviceCard({
	device,
	groupName,
	isToggling = false,
	onToggle,
}: DeviceGroupDeviceCardProps) {
	const { t } = useTranslation("device-groups");
	const navigate = useNavigate();
	const Icon = GROUP_DEVICE_TYPE_ICON[device.type] ?? GROUP_DEVICE_TYPE_ICON[1];
	const isTv = device.type === GROUP_DEVICE_TELEVISION_TYPE;
	const isToggleable = !isTv && GROUP_DEVICE_ACTUATOR_TYPES.has(device.type);
	const isOnline = device.isOnline !== false;

	const handleNavigateToDevice = () => {
		navigate("/devices", {
			state: {
				selectedDeviceId: device.id,
				returnTo: "/device-groups",
				returnLabel: groupName || t("title", "Grupos de Dispositivos"),
			},
		});
	};

	if (!isOnline) {
		return (
			// biome-ignore lint/a11y/useSemanticElements: interactive navigation container
			<div
				role="button"
				tabIndex={0}
				onClick={handleNavigateToDevice}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						handleNavigateToDevice();
					}
				}}
				className="flex items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
					<Icon className="h-5 w-5" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
				<ChevronRight className="h-4 w-4 shrink-0 text-destructive/50" />
			</div>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: interactive navigation container
		<div
			role="button"
			tabIndex={0}
			onClick={handleNavigateToDevice}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					handleNavigateToDevice();
				}
			}}
			className="group flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-container p-4 transition-all hover:border-border hover:bg-surface-high cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		>
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
					className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors"
				>
					{device.name}
				</span>
				<div className="flex items-center gap-2">
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
					{device.brand && (
						<span className="truncate text-[10px] text-muted-foreground/60">
							· {device.brand}
						</span>
					)}
				</div>
			</div>

			<div
				className="flex items-center gap-2"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{isTv ? (
					<Button
						variant="outline"
						size="sm"
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
									? t("deviceCard.toggleAriaOn", { name: device.name })
									: t("deviceCard.toggleAriaOff", { name: device.name })
							}
							className="shrink-0"
						/>
					))
				)}
				<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
			</div>
		</div>
	);
}
