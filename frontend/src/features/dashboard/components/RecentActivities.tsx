import { Bot, Clock, Lightbulb, Lock, Snowflake, Zap } from "lucide-react";
import { useDashboardOverview } from "../hooks/useDashboardOverview";

function getRelativeTime(utcTimestamp: string): string {
	const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
	const elapsedSeconds = (new Date(utcTimestamp).getTime() - Date.now()) / 1000;

	if (Math.abs(elapsedSeconds) < 60) return "Agora mesmo";
	const elapsedMinutes = Math.round(elapsedSeconds / 60);
	if (Math.abs(elapsedMinutes) < 60)
		return rtf.format(elapsedMinutes, "minute");
	const elapsedHours = Math.round(elapsedMinutes / 60);
	if (Math.abs(elapsedHours) < 24) return rtf.format(elapsedHours, "hour");
	const elapsedDays = Math.round(elapsedHours / 24);
	return rtf.format(elapsedDays, "day");
}

const EVENT_STYLE_MAP: Record<
	string,
	{ icon: typeof Zap; color: string; bg: string }
> = {
	Climate: {
		icon: Snowflake,
		color: "text-indigo-400",
		bg: "bg-indigo-500/10",
	},
	Lighting: {
		icon: Lightbulb,
		color: "text-orange-400",
		bg: "bg-orange-500/10",
	},
	Security: { icon: Lock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
	System: { icon: Bot, color: "text-zinc-400", bg: "bg-zinc-800" },
};

export function RecentActivities() {
	const { data, isLoading } = useDashboardOverview();

	if (isLoading || !data) {
		return (
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm overflow-hidden animate-pulse">
				<div className="p-6 border-b border-zinc-800/80">
					<div className="h-4 w-36 bg-zinc-800 rounded-md" />
				</div>
				<div className="divide-y divide-zinc-800/50">
					{["sk-act-1", "sk-act-2", "sk-act-3"].map((key) => (
						<div
							key={key}
							className="p-4 md:p-6 flex items-center justify-between"
						>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0" />
								<div className="space-y-2">
									<div className="h-4 w-40 bg-zinc-800 rounded-md" />
									<div className="h-3 w-28 bg-zinc-800/60 rounded-md" />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
			<div className="p-6 border-b border-zinc-800/80">
				<h3 className="text-sm font-medium text-zinc-50">
					Atividades Recentes
				</h3>
			</div>

			{/* ZERO DATA STATE */}
			{data.recentActivities.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
					<Clock className="h-8 w-8 text-zinc-600" />
					<p className="text-sm font-medium text-zinc-400">
						Nenhuma atividade recente registrada
					</p>
					<p className="max-w-sm text-xs text-zinc-600">
						Ações de ligar/desligar, automações e alertas de segurança
						aparecerão neste histórico.
					</p>
				</div>
			) : (
				<div className="divide-y divide-zinc-800/50">
					{data.recentActivities.map((item) => {
						const style = EVENT_STYLE_MAP[item.eventType] || {
							icon: Zap,
							color: "text-blue-400",
							bg: "bg-blue-500/10",
						};
						const IconComponent = style.icon;

						return (
							<div
								key={item.id}
								className="p-4 md:p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
							>
								<div className="flex items-center gap-4">
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}
									>
										<IconComponent className={`w-5 h-5 ${style.color}`} />
									</div>
									<div>
										<p className="text-sm font-medium text-zinc-50">
											{item.title}
										</p>
										<p className="text-xs text-zinc-400">{item.description}</p>
									</div>
								</div>
								<span className="text-xs text-zinc-500">
									{getRelativeTime(item.timestamp)}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
