import { Bot, Lightbulb, Lock, Snowflake } from "lucide-react";

const activities = [
	{
		icon: Snowflake,
		color: "text-indigo-400",
		bg: "bg-indigo-500/10",
		title: "Ar condicionado ligado",
		desc: "Sala de Estar • 22°C",
		time: "Há 5 min",
	},
	{
		icon: Lightbulb,
		color: "text-orange-400",
		bg: "bg-orange-500/10",
		title: "Luzes ajustadas",
		desc: "Quarto Principal • 70% brilho",
		time: "Há 12 min",
	},
	{
		icon: Lock,
		color: "text-emerald-400",
		bg: "bg-emerald-500/10",
		title: "Porta principal trancada",
		desc: "Rotina Noturna ativada",
		time: "Há 45 min",
	},
	{
		icon: Bot,
		color: "text-zinc-400",
		bg: "bg-zinc-800",
		title: "Limpeza concluída",
		desc: "Robô Aspirador • Cozinha",
		time: "Há 2 horas",
	},
];

export function RecentActivities() {
	return (
		<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
			<div className="p-6 border-b border-zinc-800/80">
				<h3 className="text-sm font-medium text-zinc-50">
					Atividades Recentes
				</h3>
			</div>
			<div className="divide-y divide-zinc-800/50">
				{activities.map((item) => (
					<div
						key={item.title}
						className="p-4 md:p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
					>
						<div className="flex items-center gap-4">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}
							>
								<item.icon className={`w-5 h-5 ${item.color}`} />
							</div>
							<div>
								<p className="text-sm font-medium text-zinc-50">{item.title}</p>
								<p className="text-xs text-zinc-400">{item.desc}</p>
							</div>
						</div>
						<span className="text-xs text-zinc-500">{item.time}</span>
					</div>
				))}
			</div>
		</div>
	);
}
