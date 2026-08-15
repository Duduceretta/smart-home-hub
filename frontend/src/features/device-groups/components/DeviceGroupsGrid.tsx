import { Layers, Plus, SearchX } from "lucide-react";
import { useMemo } from "react";
import { useDeviceGroups } from "../hooks/useDeviceGroups";
import { useDeviceGroupsUIStore } from "../store/device-groups-ui.store";
import { DeviceGroupCard } from "./DeviceGroupCard";

/**
 * Skeleton component representing a loading DeviceGroupCard placeholder.
 */
const DeviceGroupCardSkeleton = () => (
	<div className="relative flex flex-col justify-between rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm animate-pulse h-52">
		<div className="flex items-start justify-between mb-4">
			<div className="h-12 w-12 rounded-full bg-zinc-800/60" />
			<div className="h-6 w-6 rounded-md bg-zinc-800/40" />
		</div>
		<div className="flex flex-col gap-2 flex-1">
			<div className="h-5 w-3/4 bg-zinc-800/60 rounded" />
			<div className="flex gap-1.5">
				<div className="h-4 w-12 bg-zinc-800/40 rounded-full" />
				<div className="h-4 w-16 bg-zinc-800/40 rounded-full" />
			</div>
		</div>
		<div className="mt-4 pt-3 border-t border-zinc-800/40 flex gap-2">
			<div className="h-4 w-20 bg-zinc-800/40 rounded" />
		</div>
	</div>
);

export const DeviceGroupsGrid: React.FC = () => {
	const { data: groups = [], isLoading, isError } = useDeviceGroups();
	const { query, openCreateSheet, resetFilters } = useDeviceGroupsUIStore();

	// In-memory filter applying the search query from Zustand UI store
	const filteredGroups = useMemo(() => {
		if (!query.trim()) return groups;
		const searchLower = query.toLowerCase().trim();
		return groups.filter((group) =>
			group.name.toLowerCase().includes(searchLower),
		);
	}, [groups, query]);

	// 1. Loading State: Displays pulsing skeleton grid
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<DeviceGroupCardSkeleton />
				<DeviceGroupCardSkeleton />
				<DeviceGroupCardSkeleton />
			</div>
		);
	}

	// 2. Error State: Graceful degradation with retry hint
	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-12 text-center">
				<p className="text-sm font-medium text-red-400">
					Erro ao carregar os grupos de dispositivos.
				</p>
				<p className="mt-1 text-xs text-zinc-500">
					Verifique sua conexão ou se o serviço de API C# está em execução.
				</p>
			</div>
		);
	}

	// 3. Search Empty State: When query matches zero results
	if (filteredGroups.length === 0 && query.trim() !== "") {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center backdrop-blur-sm">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-400">
					<SearchX className="h-6 w-6" />
				</div>
				<h3 className="mt-4 text-sm font-medium text-zinc-200">
					Nenhum grupo encontrado
				</h3>
				<p className="mt-1 text-xs text-zinc-400 max-w-sm">
					Nenhum grupo corresponde à sua busca por "{query}".
				</p>
				<button
					type="button"
					onClick={resetFilters}
					className="mt-4 text-xs font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
				>
					Limpar busca
				</button>
			</div>
		);
	}

	// 4. Initial Empty State: When user has zero registered groups
	if (groups.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center backdrop-blur-sm">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
					<Layers className="h-6 w-6" />
				</div>
				<h3 className="mt-4 text-base font-semibold text-zinc-100">
					Nenhum grupo cadastrado
				</h3>
				<p className="mt-1 text-xs text-zinc-400 max-w-md leading-relaxed">
					Você ainda não possui grupos de dispositivos. Crie o primeiro grupo
					para organizar e controlar vários dispositivos de uma só vez.
				</p>
				<button
					type="button"
					onClick={openCreateSheet}
					className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					Cadastrar Primeiro Grupo
				</button>
			</div>
		);
	}

	// 5. Success State: Render grid with device group cards
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{filteredGroups.map((group) => (
				<DeviceGroupCard key={group.id} group={group} />
			))}
		</div>
	);
};
