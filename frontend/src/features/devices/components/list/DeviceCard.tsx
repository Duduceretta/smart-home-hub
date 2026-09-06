import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { DEVICE_CONFIG } from "../../constants/devices.constants";
import { useDeleteDevice } from "../../hooks/useDeleteDevice";
import { useDeviceCardVolume } from "../../hooks/useDeviceCardVolume";
import { useToggleDevice } from "../../hooks/useToggleDevice";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	isActuatorDevice,
} from "../../types/devices.types";
import { DeviceTelemetrySheet } from "../detail/DeviceTelemetrySheet";
import { DeviceCardClimateControl } from "./DeviceCardClimateControl";
import { DeviceCardLightControl } from "./DeviceCardLightControl";
import { DeviceCardSocketControl } from "./DeviceCardSocketControl";
import { DeviceCardTvControl } from "./DeviceCardTvControl";

interface DeviceCardProps {
	device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
	const { t } = useTranslation(["devices", "common"]);
	const confirm = useConfirm();
	const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);

	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();
	const openEditModal = useDevicesUIStore((s) => s.openEditModal);

	// Estado de reprodução em TV via ADB
	const { isPlaying } = useDeviceCardVolume(device);

	const handleDeleteClick = async () => {
		const confirmed = await confirm({
			title: t("deleteModal.title"),
			description: (
				<Trans
					t={t}
					i18nKey="deleteModal.description"
					values={{ name: device.name }}
					components={{
						bold: <span className="font-semibold text-destructive" />,
					}}
				/>
			),
			confirmLabel: t("common:actions.delete"),
			cancelLabel: t("common:actions.cancel"),
			variant: "destructive",
			icon: Trash2,
		});
		if (confirmed) deleteDevice(device.id);
	};

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const IconComponent = config.icon;
	const showToggle = isActuatorDevice(device.type);

	const isTv = device.type === DeviceTypeEnum.Television;
	const isAc = device.type === DeviceTypeEnum.Thermostat;
	const isLight = device.type === DeviceTypeEnum.Light;
	const isSocket = device.type === DeviceTypeEnum.Switch;

	const isWide = isTv || isAc;
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isOnline || isToggling) return;
		toggleDevice(device.id);
	};

	const handleInspectTelemetry = () => {
		setIsTelemetryModalOpen(true);
	};

	const renderCardBody = () => {
		if (isLight) {
			return <DeviceCardLightControl device={device} />;
		}

		if (isSocket) {
			return <DeviceCardSocketControl device={device} />;
		}

		if (isTv) {
			return <DeviceCardTvControl device={device} />;
		}

		if (isAc) {
			return <DeviceCardClimateControl device={device} />;
		}

		return (
			<div className="flex items-center justify-between text-xs mt-auto pt-3 border-t border-border-subtle/20">
				<span className="text-muted-foreground">
					{t("card.state", "Estado")}
				</span>
				<span className="text-xs font-medium tracking-wider text-muted-foreground px-2 py-1 bg-surface-container rounded-md">
					{isOn
						? t("common:status.on", "LIGADO")
						: t("common:status.off", "DESLIGADO")}
				</span>
			</div>
		);
	};

	return (
		<>
			<div
				className={`relative group rounded-xl p-4 flex flex-col justify-between min-h-43.75 transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
					isWide ? "col-span-1 md:col-span-2" : "col-span-1"
				} ${
					!isOnline
						? "bg-linear-to-br from-surface-low to-surface-low/70 opacity-50 grayscale-[0.4] hover:translate-y-0"
						: isOn
							? "bg-surface-high shadow-sm ring-1 ring-border-subtle/30"
							: "bg-linear-to-br from-surface-low to-surface-low/80"
				}`}
			>
				{isOn && (
					<div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent pointer-events-none" />
				)}

				<div className="relative z-10 flex items-start justify-between gap-4">
					<div className="flex items-center gap-4 min-w-0">
						{showToggle ? (
							<button
								type="button"
								role="switch"
								aria-checked={isOn}
								aria-label={t("card.toggleAriaLabel", { name: device.name })}
								disabled={!isOnline || isToggling}
								onClick={handleToggle}
								className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
									!isOnline
										? "bg-surface-container border border-border-subtle text-muted-foreground/50 cursor-not-allowed"
										: isOn
											? isLight
												? "bg-warm text-warm-foreground shadow-[0_0_8px_rgba(211,196,184,0.2)] hover:scale-105"
												: isAc
													? "bg-cool text-cool-foreground shadow-[0_0_8px_rgba(196,198,210,0.2)] hover:scale-105"
													: "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(197,198,207,0.2)] hover:scale-105"
											: "bg-surface-container border border-border-subtle text-muted-foreground hover:bg-surface-highest hover:text-foreground"
								}`}
							>
								<IconComponent className="w-6 h-6" />
							</button>
						) : (
							<div className="w-12 h-12 rounded-full bg-surface-container border border-border-subtle/10 flex items-center justify-center text-muted-foreground shrink-0">
								<IconComponent className="w-6 h-6" />
							</div>
						)}

						<div className="flex flex-col min-w-0">
							<button
								type="button"
								onClick={handleInspectTelemetry}
								className="text-left font-semibold text-foreground text-base leading-tight truncate hover:text-primary transition-colors before:absolute before:inset-0 focus:outline-none cursor-pointer"
							>
								{device.name}
							</button>
							<span className="text-xs font-medium tracking-wider text-muted-foreground uppercase mt-1 truncate">
								{(device.roomId
									? device.room
									: t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])
								).toUpperCase()}{" "}
								•{" "}
								{isOnline
									? device.brand.toUpperCase()
									: t("common:status.offline", "OFFLINE")}
							</span>
						</div>
					</div>

					<div className="relative z-20 flex items-center gap-1">
						{!isOnline ? (
							<div className="flex items-center gap-1 mr-1">
								<span className="h-1.5 w-1.5 rounded-full bg-alert-foreground shadow-[0_0_6px_rgba(255,180,171,0.5)]" />
								<span className="text-xs font-medium tracking-wider text-alert-foreground">
									{t("common:status.offline", "OFFLINE")}
								</span>
							</div>
						) : (
							isTv &&
							isPlaying && (
								<div className="flex items-center gap-1 mr-1">
									<span className="flex h-2 w-2 relative">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
									</span>
									<span className="text-xs font-medium tracking-wider text-primary">
										REPRODUZINDO
									</span>
								</div>
							)
						)}

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label={t("card.moreOptions")}
									className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-highest hover:text-foreground cursor-pointer outline-none"
								>
									<MoreVertical className="h-4 w-4" />
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent
								align="end"
								className="w-36 border-border-subtle bg-surface-container text-foreground shadow-xl z-50"
							>
								<DropdownMenuItem
									onClick={() => openEditModal(device)}
									className="cursor-pointer gap-2 text-xs text-muted-foreground focus:bg-surface-highest focus:text-foreground"
								>
									<Pencil className="h-3.5 w-3.5" />
									<span>{t("common:actions.edit")}</span>
								</DropdownMenuItem>

								<DropdownMenuItem
									onClick={handleDeleteClick}
									disabled={isDeleting}
									className="cursor-pointer gap-2 text-xs text-alert-foreground focus:bg-alert/20 focus:text-alert-foreground"
								>
									<Trash2 className="h-3.5 w-3.5" />
									<span>{t("common:actions.delete")}</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="relative z-10">{renderCardBody()}</div>
			</div>

			<DeviceTelemetrySheet
				device={device}
				isOpen={isTelemetryModalOpen}
				onClose={() => setIsTelemetryModalOpen(false)}
			/>
		</>
	);
};
