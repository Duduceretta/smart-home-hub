import { Bot, Clock, MonitorPlay, Music, Power } from "lucide-react";
import { ActivityTimelineRow } from "@/core/components/activity/ActivityTimelineRow";
import { Button } from "@/core/components/ui/button";
import { useRoomActivityLog } from "../hooks/useRoomActivityLog";
import { getRelativeTime } from "../lib/get-relative-time";

interface RoomActivityFeedProps {
	roomId: string;
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
	DeviceMedia: { icon: MonitorPlay, color: "text-cool", border: "border-cool" },
	Spotify: {
		icon: Music,
		color: "text-[#1DB954]",
		border: "border-[#1DB954]",
	},
	AutomationExecuted: { icon: Bot, color: "text-warm", border: "border-warm" },
};

const DEFAULT_EVENT_STYLE = {
	icon: Clock,
	color: "text-muted-foreground",
	border: "border-muted-foreground",
};

/**
 * Eventos recentes deste ambiente — `GET /rooms/{id}/events`, já filtrado
 * no back-end pelos dispositivos do ambiente (ver GetRoomActivityLogQuery.cs).
 * Estado vazio compacto, sem altura reservada.
 */
export function RoomActivityFeed({ roomId }: RoomActivityFeedProps) {
	const {
		data: entries = [],
		isLoading,
		isError,
		refetch,
	} = useRoomActivityLog(roomId);

	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Atividade Recente
			</h3>

			{isLoading ? (
				<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-3 text-xs text-muted-foreground">
					Carregando...
				</div>
			) : isError ? (
				<div className="flex items-center justify-between rounded-lg border border-dashed border-border-subtle/40 p-3 text-xs text-muted-foreground">
					<span>Não foi possível carregar a atividade recente.</span>
					<Button variant="ghost" size="xs" onClick={() => refetch()}>
						Tentar de novo
					</Button>
				</div>
			) : entries.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border-subtle/40 p-4 text-center text-xs text-muted-foreground">
					Nenhuma atividade recente.
				</p>
			) : (
				<div className="relative flex flex-col gap-4 rounded-lg border border-border-subtle/20 bg-surface-container p-4">
					<div className="absolute left-[27px] top-6 bottom-6 w-px bg-border-subtle/20" />
					{entries.map((entry) => {
						const style = EVENT_STYLE[entry.eventType] ?? DEFAULT_EVENT_STYLE;
						return (
							<ActivityTimelineRow
								key={entry.id}
								icon={style.icon}
								iconColorClassName={
									entry.isAlert ? "text-alert-foreground" : style.color
								}
								borderColorClassName={
									entry.isAlert ? "border-alert-foreground" : style.border
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
