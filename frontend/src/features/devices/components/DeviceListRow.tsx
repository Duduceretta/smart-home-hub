import { MoreVertical, Pencil, Trash2, WifiOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeleteDeviceModal } from "@/core/components/modals/DeleteDeviceModal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { DEVICE_CONFIG } from "../constants/devices.constants";
import { useDeleteDevice } from "../hooks/useDeleteDevice";
import { useToggleDevice } from "../hooks/useToggleDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	isActuatorDevice,
} from "../types/devices.types";
import { DeviceTelemetrySheet } from "./DeviceTelemetrySheet";

interface DeviceListRowProps {
	device: Device;
}

export const DeviceListRow: React.FC<DeviceListRowProps> = ({ device }) => {
	const { t } = useTranslation(["devices", "common"]);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);

	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();
	const openEditSheet = useDevicesUIStore((s) => s.openEditSheet);

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const IconComponent = config.icon;
	const showToggle = isActuatorDevice(device.type);
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;
	const isToggleDisabled = !isOnline || isToggling;

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isToggleDisabled) return;
		toggleDevice(device.id);
	};

	return (
		<>
			<div
				className={`relative group flex items-center gap-3.5 rounded-xl p-3.5 transition-all bg-gradient-to-br from-[#1c1b1c] to-[#1c1b1c]/70 ${
					!isOnline ? "opacity-70" : "hover:from-[#201f20] hover:to-[#1c1b1c]"
				}`}
			>
				{showToggle ? (
					<button
						type="button"
						role="switch"
						aria-checked={isOn}
						aria-label={t("card.toggleAriaLabel", { name: device.name })}
						disabled={isToggleDisabled}
						onClick={handleToggle}
						className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
							!isOnline
								? "bg-[#201f20] border border-[#46464b]/30 text-zinc-600 cursor-not-allowed"
								: isOn
									? "bg-[#c5c6cf] text-[#2e3037]"
									: "bg-[#201f20] border border-[#46464b]/30 text-[#c7c6cb]"
						}`}
					>
						<IconComponent className="h-4 w-4" />
					</button>
				) : (
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#201f20] border border-[#46464b]/30 text-[#c7c6cb]">
						<IconComponent className="h-4 w-4" />
					</div>
				)}

				<button
					type="button"
					onClick={() => setIsTelemetryModalOpen(true)}
					className="min-w-0 flex-1 text-left before:absolute before:inset-0 focus:outline-none cursor-pointer"
				>
					<p className="truncate text-sm font-medium text-[#e5e2e2]">
						{device.name}
					</p>
					<p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#c7c6cb]">
						{(
							device.roomId
								? device.room
								: t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])
						).toUpperCase()}{" "}
						• {device.brand.toUpperCase()}
					</p>
				</button>

				<div className="relative z-10 flex shrink-0 items-center gap-2">
					{!isOnline && (
						<span className="flex items-center gap-1 rounded-full bg-[#93000a]/20 px-2 py-1 text-[10px] font-bold tracking-wider text-[#ffb4ab]">
							<WifiOff className="h-3 w-3" />
							{t("common:status.offline")}
						</span>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label={t("card.moreOptions")}
								className="rounded-md p-1.5 text-[#c7c6cb] transition-colors hover:bg-[#353435] hover:text-[#e5e2e2] cursor-pointer outline-none"
							>
								<MoreVertical className="h-4 w-4" />
							</button>
						</DropdownMenuTrigger>

						<DropdownMenuContent
							align="end"
							className="w-36 border-[#46464b]/40 bg-[#201f20] text-[#e5e2e2] shadow-xl z-50"
						>
							<DropdownMenuItem
								onClick={() => openEditSheet(device)}
								className="cursor-pointer gap-2 text-xs text-[#c7c6cb] focus:bg-[#353435] focus:text-[#e5e2e2]"
							>
								<Pencil className="h-3.5 w-3.5" />
								<span>{t("common:actions.edit")}</span>
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() => setIsDeleteModalOpen(true)}
								className="cursor-pointer gap-2 text-xs text-[#ffb4ab] focus:bg-[#93000a]/20 focus:text-[#ffdad6]"
							>
								<Trash2 className="h-3.5 w-3.5" />
								<span>{t("common:actions.delete")}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<DeleteDeviceModal
				isOpen={isDeleteModalOpen}
				deviceName={device.name}
				onClose={() => setIsDeleteModalOpen(false)}
				isLoading={isDeleting}
				onConfirm={() => {
					deleteDevice(device.id, {
						onSuccess: () => setIsDeleteModalOpen(false),
					});
				}}
			/>

			<DeviceTelemetrySheet
				device={device}
				isOpen={isTelemetryModalOpen}
				onClose={() => setIsTelemetryModalOpen(false)}
			/>
		</>
	);
};
