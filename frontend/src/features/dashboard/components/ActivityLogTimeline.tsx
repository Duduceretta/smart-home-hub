import {
	Bot,
	ChevronRight,
	Clock,
	MonitorPlay,
	Music,
	Power,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ActivityTimelineRow } from "@/core/components/activity/ActivityTimelineRow";
import { useActivityLog } from "../hooks/useActivityLog";
import { getRelativeTime } from "../lib/relativeTime";
import type { ActivityEventType } from "../types/dashboard.types";
import { DashboardErrorState } from "./DashboardErrorState";

const VISIBLE_ENTRIES_LIMIT = 6;

const EVENT_STYLE: Record<
	ActivityEventType,
	{ icon: typeof Power; color: string; border: string }
> = {
	DeviceStatus: {
		icon: Power,
		color: "text-primary",
		border: "border-primary",
	},
	DeviceMedia: {
		icon: MonitorPlay,
		color: "text-foreground",
		border: "border-border",
	},
	Spotify: {
		icon: Music,
		color: "text-[#1DB954]",
		border: "border-[#1DB954]",
	},
	AutomationExecuted: {
		icon: Bot,
		color: "text-foreground",
		border: "border-border",
	},
};

const DEFAULT_EVENT_STYLE = {
	icon: Clock,
	color: "text-muted-foreground",
	border: "border-border-subtle",
};

export function ActivityLogTimeline() {
	const { t, i18n } = useTranslation("dashboard");
	const navigate = useNavigate();
	const { data, isLoading, isError, refetch } = useActivityLog(
		1,
		VISIBLE_ENTRIES_LIMIT,
	);
	const entries = data?.items ?? [];

	return (
		<div className="flex flex-1 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:border-border">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("activityLog.title")}
				</h3>
				<Clock className="h-4 w-4 text-muted-foreground" />
			</div>

			<div className="min-h-80">
				{isError ? (
					<div className="flex h-80 items-center justify-center">
						<DashboardErrorState
							title={t(
								"activityLog.errorTitle",
								"Não foi possível carregar a linha do tempo",
							)}
							subtitle={t(
								"activityLog.errorSubtitle",
								"Verifique sua conexão e tente novamente.",
							)}
							onRetry={() => refetch()}
						/>
					</div>
				) : isLoading || entries.length === 0 ? (
					<div className="flex h-80 flex-col items-center justify-center gap-2 text-center">
						<Clock className="h-7 w-7 text-muted-foreground" />
						<p className="text-xs font-medium text-muted-foreground">
							{isLoading
								? t("activityLog.loading", "Carregando...")
								: t("activityLog.emptyTitle")}
						</p>
					</div>
				) : (
					<div className="relative flex flex-col gap-5">
						<div className="absolute bottom-2 left-2.75 top-2 w-px bg-border-subtle" />
						{entries.map((entry) => {
							const style = EVENT_STYLE[entry.eventType] ?? DEFAULT_EVENT_STYLE;
							return (
								<ActivityTimelineRow
									key={entry.id}
									icon={style.icon}
									iconColorClassName={
										entry.isAlert ? "text-destructive" : style.color
									}
									borderColorClassName={
										entry.isAlert ? "border-destructive" : style.border
									}
									title={entry.title}
									description={entry.description}
									relativeTime={getRelativeTime(
										entry.timestamp,
										i18n.language || "pt-BR",
										t("activityLog.justNow", "Agora mesmo"),
									)}
								/>
							);
						})}
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={() =>
					navigate("/history", {
						state: {
							returnTo: "/dashboard",
							returnLabel: t("activityLog.returnToDashboard", "Início"),
						},
					})
				}
				className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-high/70 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-surface-highest hover:text-foreground cursor-pointer"
			>
				{t("activityLog.viewAll", "Ver histórico completo")}
				<ChevronRight className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
