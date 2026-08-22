import { Clock, MonitorPlay, Music, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardActivityStore } from "../store/dashboard-activity.store";
import type { ActivityEventKind } from "../types/dashboard.types";
import { getRelativeTime } from "../utils/relativeTime";

const KIND_STYLE: Record<
	ActivityEventKind,
	{ icon: typeof Power; color: string; border: string }
> = {
	"device-status": {
		icon: Power,
		color: "text-[#c5c6cf]",
		border: "border-[#c5c6cf]",
	},
	"device-media": {
		icon: MonitorPlay,
		color: "text-[#c4c6d2]",
		border: "border-[#c4c6d2]",
	},
	spotify: {
		icon: Music,
		color: "text-[#1DB954]",
		border: "border-[#1DB954]",
	},
};

export function ActivityLogTimeline() {
	const { t, i18n } = useTranslation("dashboard");
	const entries = useDashboardActivityStore((state) => state.entries);

	return (
		<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-5 flex flex-col flex-1">
			<div className="flex items-center justify-between mb-5">
				<h3 className="text-[10px] font-semibold tracking-wider text-[#c7c6cb] uppercase">
					{t("activityLog.title")}
				</h3>
				<Clock className="w-4 h-4 text-[#c7c6cb]" />
			</div>

			{entries.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
					<Clock className="h-7 w-7 text-[#c7c6cb]" />
					<p className="text-xs font-medium text-[#c7c6cb]">
						{t("activityLog.emptyTitle")}
					</p>
				</div>
			) : (
				<div className="relative flex flex-col gap-5">
					<div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#46464b]/20" />
					{entries.map((entry) => {
						const style = KIND_STYLE[entry.kind];
						const Icon = style.icon;
						return (
							<div
								key={entry.id}
								className="relative z-10 flex gap-3 items-start"
							>
								<div
									className={`w-6 h-6 rounded-full bg-[#1c1b1c] border-2 flex items-center justify-center shrink-0 mt-0.5 ${style.border}`}
								>
									<Icon className={`w-3 h-3 ${style.color}`} />
								</div>
								<div className="flex flex-col min-w-0">
									<span className="text-sm text-[#e5e2e2] truncate">
										{entry.title}
									</span>
									<span className="text-xs text-[#c7c6cb] truncate">
										{entry.description}
									</span>
									<span className="text-[10px] text-[#c7c6cb]/60 mt-0.5 uppercase">
										{getRelativeTime(
											entry.occurredAt,
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
	);
}
