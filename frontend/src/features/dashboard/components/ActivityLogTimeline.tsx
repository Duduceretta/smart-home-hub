import { Clock, MonitorPlay, Music, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useActivityLog } from "../hooks/useActivityLog";
import type { ActivityEventType } from "../types/dashboard.types";
import { getRelativeTime } from "../utils/relativeTime";

const VISIBLE_ENTRIES_LIMIT = 5;

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
		color: "text-cool",
		border: "border-cool",
	},
	Spotify: {
		icon: Music,
		color: "text-[#1DB954]",
		border: "border-[#1DB954]",
	},
};

// SystemEvent.EventType é uma coluna de texto livre — outras origens (ex:
// alertas de segurança) podem gravar valores fora dos três tipos que a
// Linha do Tempo estiliza hoje. Sem esse fallback, um eventType desconhecido
// derruba o card inteiro.
const DEFAULT_EVENT_STYLE = {
	icon: Clock,
	color: "text-muted-foreground",
	border: "border-muted-foreground",
};

export function ActivityLogTimeline() {
	const { t, i18n } = useTranslation("dashboard");
	const navigate = useNavigate();
	const { data, isLoading } = useActivityLog(1, VISIBLE_ENTRIES_LIMIT);
	const entries = data?.items ?? [];

	return (
		<div className="rounded-xl border border-border-subtle/20 bg-surface-container p-5 flex flex-col flex-1 transition-all duration-200 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
			<div className="flex items-center justify-between mb-5">
				<h3 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
					{t("activityLog.title")}
				</h3>
				<Clock className="w-4 h-4 text-muted-foreground" />
			</div>

			<div className="min-h-[320px]">
				{isLoading || entries.length === 0 ? (
					<div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center">
						<Clock className="h-7 w-7 text-muted-foreground" />
						<p className="text-xs font-medium text-muted-foreground">
							{isLoading
								? t("activityLog.loading", "Carregando...")
								: t("activityLog.emptyTitle")}
						</p>
					</div>
				) : (
					<div className="relative flex flex-col gap-5">
						<div className="absolute left-[11px] top-2 bottom-2 w-px bg-border-subtle/20" />
						{entries.map((entry) => {
							const style = EVENT_STYLE[entry.eventType] ?? DEFAULT_EVENT_STYLE;
							const Icon = style.icon;
							return (
								<div
									key={entry.id}
									className="relative z-10 flex gap-3 items-start"
								>
									<div
										className={`w-6 h-6 rounded-full bg-surface-container border-2 flex items-center justify-center shrink-0 mt-0.5 ${style.border}`}
									>
										<Icon className={`w-3 h-3 ${style.color}`} />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm text-foreground truncate">
											{entry.title}
										</span>
										<span className="text-xs text-muted-foreground truncate">
											{entry.description}
										</span>
										<span className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase">
											{getRelativeTime(
												entry.timestamp,
												i18n.language || "pt-BR",
												t("activityLog.justNow", "Agora mesmo"),
											)}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={() => navigate("/devices")}
				className="mt-4 w-full rounded-lg border border-border-subtle/20 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
			>
				{t("activityLog.viewAll")}
			</button>
		</div>
	);
}
