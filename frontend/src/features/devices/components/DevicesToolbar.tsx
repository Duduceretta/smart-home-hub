import { Search, X } from "lucide-react";
import type React from "react";
import { DEVICE_CATEGORIES } from "../constants/devices.constants";
import { useDevicesUIStore } from "../store/devices-ui.store";

export const DevicesToolbar: React.FC = () => {
	const {
		query,
		activeTab,
		statusFilter,
		setQuery,
		setActiveTab,
		setStatusFilter,
	} = useDevicesUIStore();

	const handleStatusToggle = (status: "online" | "offline") => {
		if (statusFilter === status) {
			setStatusFilter(null);
		} else {
			setStatusFilter(status);
		}
	};

	return (
		<div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between w-full">
			{/* Input de Busca */}
			<div className="relative flex-1 max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Buscar dispositivo, ambiente ou tipo..."
					aria-label="Buscar dispositivo"
					className="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/60 py-2 pl-9 pr-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
				/>
				{query && (
					<button
						type="button"
						onClick={() => setQuery("")}
						aria-label="Limpar busca"
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{/* Categorias (Tabs) */}
				<div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
					{DEVICE_CATEGORIES.map((tab) => {
						const isActive = activeTab === tab;
						return (
							<button
								key={tab}
								type="button"
								onClick={() => setActiveTab(tab)}
								aria-pressed={isActive}
								className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
									isActive
										? "border border-indigo-500 bg-indigo-500/10 text-indigo-300"
										: "border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
								}`}
							>
								{tab}
							</button>
						);
					})}
				</div>

				{/* Separador Vertical */}
				<div className="hidden h-6 w-px bg-zinc-800/80 lg:block mx-1" />

				{/* Status Online/Offline */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => handleStatusToggle("online")}
						aria-pressed={statusFilter === "online"}
						className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
							statusFilter === "online"
								? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
								: "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
						}`}
					>
						<span className="h-2 w-2 rounded-full bg-emerald-400" /> Online
					</button>
					<button
						type="button"
						onClick={() => handleStatusToggle("offline")}
						aria-pressed={statusFilter === "offline"}
						className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
							statusFilter === "offline"
								? "border-zinc-600 bg-zinc-700/40 text-zinc-200"
								: "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
						}`}
					>
						<span className="h-2 w-2 rounded-full bg-zinc-500" /> Offline
					</button>
				</div>
			</div>
		</div>
	);
};
