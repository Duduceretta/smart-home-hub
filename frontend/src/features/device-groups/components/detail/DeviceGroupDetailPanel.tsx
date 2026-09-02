import { ArrowLeft, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { GROUP_ICON_MAP } from "../../constants/device-groups.constants";
import { useDeviceGroupsUIStore } from "../../store/device-groups-ui.store";
import type { DeviceGroup } from "../../types/device-groups.types";
import { DeviceGroupDetailContent } from "./DeviceGroupDetailContent";

interface DeviceGroupDetailPanelProps {
	group: DeviceGroup | null;
	onBack?: () => void;
}

/**
 * Right column detail panel for a selected DeviceGroup.
 * Header displays group icon, name, badge count, and edit trigger button.
 */
export function DeviceGroupDetailPanel({
	group,
	onBack,
}: DeviceGroupDetailPanelProps) {
	const { t } = useTranslation("device-groups");
	const openEditDialog = useDeviceGroupsUIStore((s) => s.openEditDialog);

	const MobileBackButton = onBack && (
		<button
			type="button"
			onClick={onBack}
			aria-label={t("detail.backToList", "Voltar pra lista")}
			className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer lg:hidden"
		>
			<ArrowLeft className="h-5 w-5" />
		</button>
	);

	if (!group) {
		return (
			<div className="flex h-full max-h-full min-h-50 flex-col items-center justify-center p-6 text-center lg:rounded-xl lg:border lg:border-dashed lg:border-border-subtle lg:bg-surface-low">
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						className="mb-4 inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-container px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer lg:hidden"
					>
						<ArrowLeft className="h-4 w-4" />
						{t("detail.backToList", "Voltar pra lista")}
					</button>
				)}
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
		<div className="flex h-full max-h-full flex-col lg:overflow-hidden lg:rounded-xl lg:border lg:border-border-subtle lg:bg-surface-low lg:shadow-sm">
			{/* Panel Header */}
			<div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-subtle/50 pb-4 lg:bg-surface-container/50 lg:p-6">
				<div className="flex min-w-0 items-center gap-2 sm:gap-4">
					{MobileBackButton}
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
