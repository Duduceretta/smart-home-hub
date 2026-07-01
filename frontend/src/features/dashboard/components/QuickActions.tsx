import { Lock, Play } from "lucide-react";

export function QuickActions() {
	return (
		<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-5">
			<h3 className="text-sm font-medium text-zinc-50 mb-4">Cenas Rápidas</h3>
			<div className="grid grid-cols-2 gap-3">
				<button
					type="button"
					className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors group"
				>
					<Play className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 mb-2" />
					<span className="text-xs font-medium text-zinc-300">Modo Filme</span>
				</button>
				<button
					type="button"
					className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors group"
				>
					<Lock className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 mb-2" />
					<span className="text-xs font-medium text-zinc-300">
						Sair de Casa
					</span>
				</button>
			</div>
		</div>
	);
}
