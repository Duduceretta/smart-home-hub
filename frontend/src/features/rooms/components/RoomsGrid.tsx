import { DoorOpen, Plus, SearchX } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRooms } from "../hooks/useRooms";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import { RoomCard } from "./RoomCard";

/**
 * Skeleton component representing a loading RoomCard placeholder.
 */
const RoomCardSkeleton = () => (
	<div className="relative flex flex-col justify-between rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm animate-pulse h-48">
		<div className="flex items-start justify-between mb-4">
			<div className="h-12 w-12 rounded-full bg-zinc-800/60" />
			<div className="h-6 w-6 rounded-md bg-zinc-800/40" />
		</div>
		<div className="flex flex-col gap-2 flex-1">
			<div className="h-5 w-3/4 bg-zinc-800/60 rounded" />
			<div className="h-3 w-1/2 bg-zinc-800/40 rounded" />
		</div>
		<div className="mt-4 pt-3 border-t border-zinc-800/40 flex gap-2">
			<div className="h-4 w-20 bg-zinc-800/40 rounded" />
		</div>
	</div>
);

export const RoomsGrid: React.FC = () => {
	const { t } = useTranslation("rooms");
	const { data: rooms = [], isLoading, isError } = useRooms();
	const { query, openCreateSheet, resetFilters } = useRoomsUIStore();

	// In-memory filter applying the search query from Zustand UI store
	const filteredRooms = useMemo(() => {
		if (!query.trim()) return rooms;
		const searchLower = query.toLowerCase().trim();
		return rooms.filter((room) =>
			room.name.toLowerCase().includes(searchLower),
		);
	}, [rooms, query]);

	// 1. Loading State: Displays pulsing skeleton grid
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<RoomCardSkeleton />
				<RoomCardSkeleton />
				<RoomCardSkeleton />
			</div>
		);
	}

	// 2. Error State: Graceful degradation with retry hint
	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-12 text-center">
				<p className="text-sm font-medium text-red-400">
					{t("grid.errorTitle")}
				</p>
				<p className="mt-1 text-xs text-zinc-500">
					{t("grid.errorSubtitle")}
				</p>
			</div>
		);
	}

	// 3. Search Empty State: When query matches zero results
	if (filteredRooms.length === 0 && query.trim() !== "") {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center backdrop-blur-sm">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-400">
					<SearchX className="h-6 w-6" />
				</div>
				<h3 className="mt-4 text-sm font-medium text-zinc-200">
					{t("grid.searchEmptyTitle")}
				</h3>
				<p className="mt-1 text-xs text-zinc-400 max-w-sm">
					{t("grid.searchEmptySubtitle", { query })}
				</p>
				<button
					type="button"
					onClick={resetFilters}
					className="mt-4 text-xs font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
				>
					{t("grid.clearSearch")}
				</button>
			</div>
		);
	}

	// 4. Initial Empty State: When user has zero registered rooms
	if (rooms.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center backdrop-blur-sm">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
					<DoorOpen className="h-6 w-6" />
				</div>
				<h3 className="mt-4 text-base font-semibold text-zinc-100">
					{t("grid.emptyTitle")}
				</h3>
				<p className="mt-1 text-xs text-zinc-400 max-w-md leading-relaxed">
					{t("grid.emptySubtitle")}
				</p>
				<button
					type="button"
					onClick={openCreateSheet}
					className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					{t("grid.emptyCta")}
				</button>
			</div>
		);
	}

	// 5. Success State: Render grid with room cards
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{filteredRooms.map((room) => (
				<RoomCard key={room.id} room={room} />
			))}
		</div>
	);
};
