import { Trash2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { GROUP_ICON_MAP } from "../../constants/device-groups.constants";
import type {
	DeviceGroup,
	DeviceGroupsViewMode,
} from "../../types/device-groups.types";

interface DeviceGroupListItemProps {
	group: DeviceGroup;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onDelete: (group: DeviceGroup) => void;
	viewMode: DeviceGroupsViewMode;
}

/**
 * List item for a device group. Supports both "cards" and "list" density modes.
 * Mirrors `RoomListItem` with unified UI, direct deletion action, and keyboard navigation.
 */
export function DeviceGroupListItem({
	group,
	isSelected,
	onSelect,
	onDelete,
	viewMode,
}: DeviceGroupListItemProps) {
	const { t } = useTranslation("device-groups");
	const Icon = GROUP_ICON_MAP[group.icon ?? ""] ?? GROUP_ICON_MAP.default;

	const deviceCount = group.devices.length;
	const activeCount = group.devices.filter((d) => d.isOn).length;

	return (
		// biome-ignore lint/a11y/useSemanticElements: selection item in custom master-detail list, requires role="button" for keyboard
		<div
			role="button"
			tabIndex={0}
			data-group-item
			onClick={() => onSelect(group.id)}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onSelect(group.id);
			}}
			aria-current={isSelected}
			className={cn(
				"group flex w-full items-center gap-3 rounded-lg border text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				viewMode === "cards" ? "p-3" : "px-3 py-2",
				isSelected
					? "border-primary/40 bg-primary/10 shadow-xs"
					: "border-transparent bg-surface-container/60 hover:bg-surface-high hover:border-border-subtle/50",
			)}
		>
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-full transition-colors",
					viewMode === "cards" ? "h-10 w-10" : "h-8 w-8",
					isSelected
						? "bg-primary text-primary-foreground shadow-xs"
						: "bg-surface-high text-muted-foreground group-hover:text-foreground",
				)}
			>
				<Icon className={viewMode === "cards" ? "h-5 w-5" : "h-4 w-4"} />
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className={cn(
						"flex items-center gap-1.5 truncate text-sm transition-colors",
						isSelected
							? "font-semibold text-foreground"
							: "font-medium text-foreground/90 group-hover:text-foreground",
					)}
				>
					{group.name}
					{activeCount > 0 && viewMode === "cards" && (
						<span className="flex items-center gap-1 text-xs text-primary font-normal">
							<Zap className="h-3 w-3" />
							{activeCount}
						</span>
					)}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{t("item.device", `${deviceCount} dispositivo`, {
						count: deviceCount,
					})}
					{activeCount > 0 &&
						` · ${t("item.active", `${activeCount} ligado(s)`, { count: activeCount })}`}
				</span>
			</div>

			{activeCount > 0 && viewMode === "list" && (
				<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
					<Zap className="h-3.5 w-3.5" />
					{activeCount}
				</span>
			)}

			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					onDelete(group);
				}}
				aria-label={t("item.deleteAria", `Excluir grupo ${group.name}`, {
					name: group.name,
				})}
				className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 outline-none transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
			>
				<Trash2 className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
