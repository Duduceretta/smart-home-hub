import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import type { DeviceGroup } from "../../types/device-groups.types";

interface DeviceGroupsSummaryBarProps {
	groups: DeviceGroup[];
}

/**
 * Summary stats bar displayed above the device groups list panel.
 * Mirrors `RoomsSummaryBar` style with single-line density and semantic tokens.
 */
export function DeviceGroupsSummaryBar({
	groups,
}: DeviceGroupsSummaryBarProps) {
	const { t } = useTranslation("device-groups");

	const totalDevices = groups.reduce((acc, g) => acc + g.devices.length, 0);
	const activeDevices = groups.reduce(
		(acc, g) => acc + g.devices.filter((d) => d.isOn).length,
		0,
	);

	return (
		<div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
			<span>
				<span className="font-semibold text-foreground">{groups.length}</span>{" "}
				{t("summaryBar.group", "grupo", { count: groups.length })}
			</span>
			<span className="text-border">·</span>
			<span>
				<span className="font-semibold text-foreground">{totalDevices}</span>{" "}
				{t("summaryBar.device", "dispositivo", { count: totalDevices })}
			</span>
			<span className="text-border">·</span>
			<span>
				<span
					className={cn(
						"font-semibold transition-colors",
						activeDevices > 0 ? "text-primary" : "text-foreground",
					)}
				>
					{activeDevices}
				</span>{" "}
				{t("summaryBar.active", "ativo(s)")}
			</span>
		</div>
	);
}
