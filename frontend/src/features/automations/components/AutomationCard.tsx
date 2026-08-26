import { Bot, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { useDeleteAutomation } from "../hooks/useDeleteAutomation";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import type { Automation, AutomationPayload } from "../types/automations.types";

interface AutomationCardProps {
	automation: Automation;
}

function parsePayload(rulePayload: string): AutomationPayload | null {
	try {
		return JSON.parse(rulePayload) as AutomationPayload;
	} catch {
		return null;
	}
}

export const AutomationCard: React.FC<AutomationCardProps> = ({
	automation,
}) => {
	const { t } = useTranslation(["automations", "common"]);
	const openEditSheet = useAutomationsUIStore((state) => state.openEditSheet);
	const { mutate: deleteAutomation, isPending } = useDeleteAutomation();

	const payload = useMemo(
		() => parsePayload(automation.rulePayload),
		[automation.rulePayload],
	);
	const trigger = payload?.triggers?.[0];
	const actionsCount = payload?.actions?.length ?? 0;

	const triggerSummary = !payload
		? t("card.invalidPayload")
		: trigger?.type === "time"
			? t("card.triggerSummary.time", { cron: trigger.cronExpression })
			: trigger?.type === "device_state"
				? t("card.triggerSummary.deviceState")
				: t("card.triggerSummary.none");

	const handleDelete = () => {
		if (confirm(t("card.confirmDelete", { name: automation.name }))) {
			deleteAutomation(automation.id);
		}
	};

	return (
		<div className="group relative flex flex-col justify-between rounded-xl border border-border-subtle/20 bg-surface-container p-5 transition-all duration-200 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
			<div className="flex items-start justify-between">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high text-primary transition-transform duration-300 group-hover:scale-110">
					<Bot className="h-6 w-6" />
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t("card.optionsAriaLabel")}
							className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer outline-none"
						>
							<MoreVertical className="h-5 w-5" />
						</button>
					</DropdownMenuTrigger>

					<DropdownMenuContent align="end" className="w-36">
						<DropdownMenuItem
							onClick={() => openEditSheet(automation)}
							className="cursor-pointer gap-2 text-xs"
						>
							<Pencil className="h-3.5 w-3.5" />
							{t("common:actions.edit")}
						</DropdownMenuItem>

						<DropdownMenuItem
							onClick={handleDelete}
							disabled={isPending}
							variant="destructive"
							className="cursor-pointer gap-2 text-xs"
						>
							<Trash2 className="h-3.5 w-3.5" />
							{isPending ? t("card.deleting") : t("common:actions.delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="mt-4 flex flex-1 flex-col gap-1">
				<h3 className="text-lg font-semibold tracking-tight text-foreground">
					{automation.name}
				</h3>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="relative flex h-2 w-2">
						{automation.isActive && (
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
						)}
						<span
							className={`relative inline-flex h-2 w-2 rounded-full ${
								automation.isActive ? "bg-primary" : "bg-surface-highest"
							}`}
						/>
					</span>
					<span>
						{automation.isActive ? t("card.active") : t("card.inactive")}
					</span>
				</div>
				<p className="mt-1 text-xs text-muted-foreground">{triggerSummary}</p>
			</div>

			<div className="mt-4 flex items-center gap-2 border-t border-border-subtle/20 pt-3">
				<span className="rounded bg-surface-high px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
					{t("card.actionsCount", { count: actionsCount })}
				</span>
			</div>
		</div>
	);
};
