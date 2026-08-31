import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { GROUP_ICON_MAP } from "../../constants/device-groups.constants";
import { useDeviceGroupsUIStore } from "../../store/device-groups-ui.store";
import type { DeviceGroup } from "../../types/device-groups.types";
import { DeviceGroupDetailContent } from "./DeviceGroupDetailContent";

interface DeviceGroupDetailPanelProps {
	group: DeviceGroup | null;
}

/**
 * Right column detail panel for a selected DeviceGroup.
 * Header displays group icon, name, badge count, and edit trigger button.
 */
export function DeviceGroupDetailPanel({ group }: DeviceGroupDetailPanelProps) {
	const { t } = useTranslation("device-groups");
	const openEditDialog = useDeviceGroupsUIStore((s) => s.openEditDialog);

	if (!group) {
		return (
			<div className="flex h-full max-h-full min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-low text-center">
				<p className="text-sm text-muted-foreground">
					{t(
						"detail.selectPrompt",
						"Selecione um grupo de dispositivos pra ver os detalhes.",
					)}
				</p>
			</div>
		);
	}

	const Icon = GROUP_ICON_MAP[group.icon ?? ""] ?? GROUP_ICON_MAP.default;

	return (
		<div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-low shadow-sm">
			{/* Panel Header */}
			<div className="flex shrink-0 items-center justify-between gap-4 bg-surface-container/50 p-6 border-b border-border-subtle/50">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary shadow-xs">
						<Icon className="h-6 w-6" />
					</div>
					<div className="min-w-0">
						<h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
							{group.name}
						</h2>
						<p className="text-sm text-muted-foreground">
							{t(
								"detail.deviceConnected",
								`${group.devices.length} dispositivo${group.devices.length === 1 ? "" : "s"} vinculado${group.devices.length === 1 ? "" : "s"}`,
								{ count: group.devices.length },
							)}
						</p>
					</div>
				</div>

				<Button
					variant="outline"
					className="shrink-0 border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40"
					onClick={() => openEditDialog(group)}
				>
					<Pencil className="h-4 w-4" />
					{t("detail.edit", "Editar")}
				</Button>
			</div>

			<DeviceGroupDetailContent group={group} />
		</div>
	);
}
