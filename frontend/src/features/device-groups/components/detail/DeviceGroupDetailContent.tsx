import { Layers, Power, PowerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DeviceGroup } from "../../types/device-groups.types";
import { DeviceGroupDeviceGrid } from "./DeviceGroupDeviceGrid";
import { DeviceGroupKpiCard } from "./DeviceGroupKpiCard";
import { DeviceGroupQuickActions } from "./DeviceGroupQuickActions";

interface DeviceGroupDetailContentProps {
	group: DeviceGroup;
}

/**
 * Body of the device group detail panel.
 * Contains quick bulk power actions, group-level metric KPIs, and the devices grid.
 */
export function DeviceGroupDetailContent({
	group,
}: DeviceGroupDetailContentProps) {
	const { t } = useTranslation("device-groups");

	const totalCount = group.devices.length;
	const activeCount = group.devices.filter((d) => d.isOn).length;
	const inactiveCount = totalCount - activeCount;

	return (
		<div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-8 scrollbar-thin">
			<div className="flex flex-col gap-6">
				{/* Bulk power actions */}
				<DeviceGroupQuickActions devices={group.devices} />

				{/* Group Summary KPIs */}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<DeviceGroupKpiCard
						icon={Layers}
						label={t("kpis.totalDevices", "Total no Grupo")}
						value={totalCount}
						accentClassName="text-foreground"
					/>
					<DeviceGroupKpiCard
						icon={Power}
						label={t("kpis.activeDevices", "Ligados / Ativos")}
						value={activeCount}
						accentClassName={
							activeCount > 0 ? "text-primary" : "text-muted-foreground"
						}
					/>
					<DeviceGroupKpiCard
						icon={PowerOff}
						label={t("kpis.inactiveDevices", "Desligados")}
						value={inactiveCount}
						accentClassName="text-muted-foreground"
					/>
				</div>

				{/* Group Devices Grid */}
				<DeviceGroupDeviceGrid group={group} devices={group.devices} />
			</div>
		</div>
	);
}
