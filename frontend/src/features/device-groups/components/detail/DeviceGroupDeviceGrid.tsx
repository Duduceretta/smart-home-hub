import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToggleDeviceGroupDevice } from "../../hooks/useToggleDeviceGroupDevice";
import { useDeviceGroupsUIStore } from "../../store/device-groups-ui.store";
import type {
	DeviceGroup,
	DeviceInGroup,
} from "../../types/device-groups.types";
import { DeviceGroupDeviceCard } from "./DeviceGroupDeviceCard";

interface DeviceGroupDeviceGridProps {
	group: DeviceGroup;
	devices: DeviceInGroup[];
}

/**
 * Grid displaying the devices associated with a selected DeviceGroup.
 * Allows inline toggling and quick opening of the edit modal to manage devices.
 */
export function DeviceGroupDeviceGrid({
	group,
	devices,
}: DeviceGroupDeviceGridProps) {
	const { t } = useTranslation("device-groups");
	const openEditDialog = useDeviceGroupsUIStore((s) => s.openEditDialog);
	const toggleDevice = useToggleDeviceGroupDevice();

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
					{t("deviceGrid.title", "Dispositivos no Grupo")}
				</h3>
				<span className="text-xs text-muted-foreground">
					{t("deviceGrid.devicesCount", {
						count: devices.length,
					})}
				</span>
			</div>

			{devices.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border-subtle bg-surface-container/20 p-6 text-center text-sm text-muted-foreground">
					{t(
						"deviceGrid.empty",
						"Nenhum dispositivo vinculado a este grupo ainda.",
					)}
				</p>
			) : (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
					{devices.map((device) => (
						<DeviceGroupDeviceCard
							key={device.id}
							device={device}
							groupName={group.name}
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
				onClick={() => openEditDialog(group, { focusDevices: true })}
				className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-surface-container/30 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-surface-container hover:text-foreground cursor-pointer"
			>
				<Plus className="h-4 w-4" />
				{t("deviceGrid.manageDevices", "Gerenciar Dispositivos deste Grupo")}
			</button>
		</div>
	);
}
