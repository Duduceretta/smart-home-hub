import { Plus } from "lucide-react";
import type React from "react";
import { useDevicesUIStore } from "../store/devices-ui.store";


export const DevicesHeader: React.FC = () => {
	const openCreateSheet = useDevicesUIStore((state) => state.openCreateSheet);

	return (
		<div className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-end">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-zinc-50">
					Dispositivos
				</h1>
				<p className="mt-1 text-sm text-zinc-400">
					Gerencie e monitore todos os seus sensores e atuadores.
				</p>
			</div>
			<button
				type="button"
				onClick={openCreateSheet}
				className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 cursor-pointer shadow-lg shadow-indigo-600/20"
			>
				<Plus className="h-4 w-4" />
				Novo Dispositivo
			</button>
		</div>
	);
};
