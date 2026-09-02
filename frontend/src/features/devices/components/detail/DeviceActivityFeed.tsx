import { Bot, Clock, MonitorPlay, Music, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActivityTimelineRow } from "@/core/components/activity/ActivityTimelineRow";
import { Button } from "@/core/components/ui/button";
import { useDeviceActivityLog } from "../../hooks/useDeviceActivityLog";
import { getRelativeTime } from "../../lib/get-relative-time";

interface DeviceActivityFeedProps {
	deviceId: string;
}

const EVENT_STYLE: Record<
	string,
	{ icon: typeof Power; color: string; border: string }
> = {
	DeviceStatus: {
		icon: Power,
		color: "text-primary",
		border: "border-primary",
	},
	DeviceMedia: {
		icon: MonitorPlay,
		color: "text-primary/90",
		border: "border-primary/50",
	},
	Spotify: {
		icon: Music,
		// design-token-lint-ignore: verde oficial da marca Spotify, identidade visual de terceiro
		color: "text-[#1DB954]",
		// design-token-lint-ignore: verde oficial da marca Spotify, identidade visual de terceiro
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

/**
 * Cópia adaptada de `rooms/components/detail/RoomActivityFeed.tsx`
 * (isolamento do FSD), filtrada por dispositivo em vez de ambiente.
 */
export function DeviceActivityFeed({ deviceId }: DeviceActivityFeedProps) {
	const { t } = useTranslation("devices");
	const {
		data: entries = [],
		isLoading,
		isError,
		refetch,
	} = useDeviceActivityLog(deviceId);

	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{t("activity.title", "Atividade Recente")}
			</h3>

			{isLoading ? (
				<div className="rounded-lg border border-border-subtle bg-surface-container p-3 text-xs text-muted-foreground">
					{t("activity.loading", "Carregando...")}
				</div>
			) : isError ? (
				<div className="flex items-center justify-between rounded-lg border border-dashed border-border-subtle p-3 text-xs text-muted-foreground">
					<span>
						{t(
							"activity.errorLoad",
							"Não foi possível carregar a atividade recente.",
						)}
					</span>
					<Button variant="ghost" size="xs" onClick={() => refetch()}>
						{t("activity.retry", "Tentar de novo")}
					</Button>
				</div>
			) : entries.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border-subtle bg-surface-container/20 p-4 text-center text-xs text-muted-foreground">
					{t("activity.empty", "Nenhuma atividade recente.")}
				</p>
			) : (
				<div className="relative flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-container p-4">
					<div className="absolute left-6.75 top-6 bottom-6 w-px bg-border-subtle" />
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
								relativeTime={getRelativeTime(entry.timestamp)}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
