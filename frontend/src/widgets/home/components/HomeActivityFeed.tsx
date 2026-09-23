import { Activity, AlertTriangle, ArrowRight, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/core/utils";
import { getRelativeTime } from "@/features/dashboard/lib/relativeTime";
import type { ActivityLogEntry } from "@/features/dashboard/types/dashboard.types";
import { CATEGORY_ICON_CLASS } from "../constants/home-categories";

const VISIBLE_ENTRIES_LIMIT = 5;

interface HomeActivityFeedProps {
	entries: ActivityLogEntry[];
}

/**
 * Feed compacto de atividades recentes da residência (Bento Tile).
 *
 * Exibe automações disparadas, alertas e alterações de estado relevantes.
 * O link "Ver tudo" direciona para `/history` (tela dedicada de log completo do sistema).
 */
export function HomeActivityFeed({ entries }: HomeActivityFeedProps) {
	const { t, i18n } = useTranslation("home");
	const visibleEntries = entries.slice(0, VISIBLE_ENTRIES_LIMIT);

	const getEventIcon = (entry: ActivityLogEntry) => {
		if (entry.isAlert) {
			return <AlertTriangle className="h-4 w-4 text-alert" />;
		}
		if (
			entry.title.toLowerCase().includes("automação") ||
			entry.description.toLowerCase().includes("automação")
		) {
			return <Bot className={cn("h-4 w-4", CATEGORY_ICON_CLASS.monitoring)} />;
		}
		return <Activity className="h-4 w-4 text-muted-foreground" />;
	};

	return (
		<section className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border-subtle bg-card p-4 sm:p-5 shadow-2xs">
			<div className="flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("activity.title", "Atividade recente")}
				</h2>
				<Link
					to="/history"
					className="group flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
				>
					<span>{t("activity.viewAll", "Ver tudo")}</span>
					<ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
				</Link>
			</div>

			{visibleEntries.length === 0 ? (
				<div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border-subtle bg-popover p-6 text-center text-xs text-muted-foreground">
					{t("activity.empty", "Nenhuma atividade recente.")}
				</div>
			) : (
				<ul className="flex flex-1 flex-col divide-y divide-border-subtle/60 rounded-lg border border-border-subtle bg-popover overflow-hidden shadow-2xs">
					{visibleEntries.map((entry) => (
						<li
							key={entry.id}
							className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 transition-colors hover:bg-surface-highest"
						>
							<div
								className={cn(
									"flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
									entry.isAlert
										? "border-alert/30 bg-alert/15"
										: "border-border-subtle bg-muted",
								)}
							>
								{getEventIcon(entry)}
							</div>

							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-xs font-medium text-foreground">
									{entry.title}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{entry.description}
								</span>
							</div>

							<span className="shrink-0 text-xs text-muted-foreground">
								{getRelativeTime(
									entry.timestamp,
									i18n.language,
									t("activity.justNow", "Agora"),
								)}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
