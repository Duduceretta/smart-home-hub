import { ShieldAlert, Thermometer, Zap } from "lucide-react";

export function DashboardMetrics() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between relative overflow-hidden group">
				<div className="flex justify-between items-start relative z-10">
					<span className="text-sm font-medium text-zinc-400">
						Consumo de Energia
					</span>
					<Zap className="w-5 h-5 text-emerald-400" />
				</div>
				<div className="mt-4 relative z-10">
					<span className="text-3xl font-bold text-zinc-50">12.4</span>
					<span className="text-sm text-zinc-400 ml-1">kWh</span>
				</div>
				<div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-400/20">
					<div className="h-full bg-emerald-400 w-2/3"></div>
				</div>
			</div>

			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(99,102,241,0.05)]">
				<div className="flex justify-between items-start">
					<span className="text-sm font-medium text-zinc-400">
						Dispositivos Online
					</span>
					<div className="relative flex h-3 w-3 mt-1">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
						<span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
					</div>
				</div>
				<div className="mt-4">
					<span className="text-3xl font-bold text-zinc-50">14</span>
					<span className="text-sm text-zinc-400 ml-1">/ 16 ativos</span>
				</div>
			</div>

			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
				<div className="flex justify-between items-start">
					<span className="text-sm font-medium text-zinc-400">
						Temperatura Média
					</span>
					<Thermometer className="w-5 h-5 text-orange-400" />
				</div>
				<div className="mt-4 flex items-end gap-2">
					<span className="text-3xl font-bold text-zinc-50">23°C</span>
					<span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full mb-1">
						-1°C
					</span>
				</div>
			</div>

			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
				<div className="flex justify-between items-start">
					<span className="text-sm font-medium text-zinc-400">
						Alertas de Segurança
					</span>
					<ShieldAlert className="w-5 h-5 text-zinc-500" />
				</div>
				<div className="mt-4">
					<span className="text-3xl font-bold text-zinc-50">0</span>
					<span className="text-sm text-zinc-400 ml-1">alertas</span>
				</div>
			</div>
		</div>
	);
}
