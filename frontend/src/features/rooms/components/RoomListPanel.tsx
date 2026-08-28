import { LayoutGrid, List } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/core/utils";
import type { RoomPickerDevice } from "../types/room-devices.types";
import type { Room, RoomsViewMode } from "../types/rooms.types";
import { RoomListItem } from "./RoomListItem";

interface RoomListPanelProps {
	rooms: Room[];
	devicesByRoom: Map<string, RoomPickerDevice[]>;
	selectedId: string | null;
	onSelect: (id: string) => void;
	onDelete: (room: Room) => void;
	viewMode: RoomsViewMode;
	onViewModeChange: (mode: RoomsViewMode) => void;
}

/**
 * Coluna esquerda do split-view — mesmo card flutuante (borda + raio +
 * fundo próprio) do `AutomationListPanel`. Mesmo toggle cards/lista
 * (ícones, segmented control) e scrollbar oculta (`scrollbar-thin`) já
 * usados em Automações. Sem paginação incremental: a base de ambientes é
 * pequena (dezenas, não milhares).
 */
export function RoomListPanel({
	rooms,
	devicesByRoom,
	selectedId,
	onSelect,
	onDelete,
	viewMode,
	onViewModeChange,
}: RoomListPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
		const container = containerRef.current;
		if (!container) return;

		const items = Array.from(
			container.querySelectorAll<HTMLElement>("[data-room-item]"),
		);
		const currentIndex = items.indexOf(document.activeElement as HTMLElement);
		if (currentIndex === -1) return;

		event.preventDefault();
		const nextIndex =
			event.key === "ArrowDown"
				? Math.min(currentIndex + 1, items.length - 1)
				: Math.max(currentIndex - 1, 0);
		items[nextIndex]?.focus();
	};

	return (
		<div className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl border border-border-subtle/20 bg-surface-low">
			<div className="flex shrink-0 items-center justify-between border-b border-border-subtle/20 px-3 py-2.5">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{rooms.length} ambiente{rooms.length === 1 ? "" : "s"}
				</span>

				{/* biome-ignore lint/a11y/useSemanticElements: segmented control de 2 botões, não um form <fieldset> */}
				<div
					role="group"
					aria-label="Modo de visualização da lista"
					className="flex items-center gap-0.5 rounded-md bg-surface-high p-0.5"
				>
					<button
						type="button"
						onClick={() => onViewModeChange("cards")}
						aria-label="Ver como cards"
						aria-pressed={viewMode === "cards"}
						className={cn(
							"flex h-6 w-6 items-center justify-center rounded transition-colors cursor-pointer",
							viewMode === "cards"
								? "bg-surface-container text-primary shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<LayoutGrid className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => onViewModeChange("list")}
						aria-label="Ver como lista"
						aria-pressed={viewMode === "list"}
						className={cn(
							"flex h-6 w-6 items-center justify-center rounded transition-colors cursor-pointer",
							viewMode === "list"
								? "bg-surface-container text-primary shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<List className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{/* biome-ignore lint/a11y/useSemanticElements: container só encaminha ArrowUp/Down pro item focado, não é um form <fieldset> */}
			<div
				ref={containerRef}
				role="group"
				aria-label="Lista de ambientes"
				onKeyDown={handleKeyDown}
				className={cn(
					"flex-1 overflow-y-auto scrollbar-thin p-3",
					viewMode === "cards" ? "space-y-2" : "space-y-1",
				)}
			>
				{rooms.length === 0 ? (
					<p className="p-4 text-center text-xs text-muted-foreground">
						Nenhum ambiente encontrado.
					</p>
				) : (
					rooms.map((room) => (
						<RoomListItem
							key={room.id}
							room={room}
							devices={devicesByRoom.get(room.id) ?? []}
							isSelected={room.id === selectedId}
							onSelect={onSelect}
							onDelete={onDelete}
							viewMode={viewMode}
						/>
					))
				)}
			</div>
		</div>
	);
}
