import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import type {
	Room,
	RoomPickerDevice,
	RoomsViewMode,
} from "../../types/rooms.types";
import { RoomListItem } from "./RoomListItem";

interface RoomListPanelProps {
	rooms: Room[];
	devicesByRoom: Map<string, RoomPickerDevice[]>;
	selectedId: string | null;
	onSelect: (id: string) => void;
	onDelete: (room: Room) => void;
	onCreate: () => void;
	viewMode: RoomsViewMode;
	onViewModeChange: (mode: RoomsViewMode) => void;
	query: string;
	onQueryChange: (query: string) => void;
}

const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Coluna esquerda do split-view — mesmo card flutuante (borda + raio +
 * fundo próprio) do `AutomationListPanel`. Busca (com atalho Ctrl+K/⌘K,
 * padrão Linear/Vercel) e criação de ambiente vivem só aqui — o header da
 * página não tem mais esses controles. Mesmo toggle cards/lista (ícones,
 * segmented control) e scrollbar oculta (`scrollbar-thin`) já usados em
 * Automações. Sem paginação incremental: a base de ambientes é pequena
 * (dezenas, não milhares).
 */
export function RoomListPanel({
	rooms,
	devicesByRoom,
	selectedId,
	onSelect,
	onDelete,
	onCreate,
	viewMode,
	onViewModeChange,
	query,
	onQueryChange,
}: RoomListPanelProps) {
	const { t } = useTranslation("rooms");
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleGlobalKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, []);

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
		<div className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl bg-surface-low shadow-sm">
			{/* Cabeçalho elevado por superfície/fundo, sem bordas marcadas */}
			<div className="flex shrink-0 flex-col gap-2.5 bg-surface-container/50 p-3">
				<div className="flex items-center justify-between">
					<span className="pl-1.5 text-sm font-semibold tracking-wide text-foreground">
						{t(
							"list.room",
							`${rooms.length} ambiente${rooms.length === 1 ? "" : "s"}`,
							{ count: rooms.length },
						)}
					</span>

					{/* Segmented Control sem bordas agressivas */}
					{/* biome-ignore lint/a11y/useSemanticElements: segmented control de 2 botões, não um form <fieldset> */}
					<div
						role="group"
						aria-label={t(
							"list.viewModeGroup",
							"Modo de visualização da lista",
						)}
						className="flex items-center gap-0.5 rounded-md bg-surface-high/60 p-0.5"
					>
						<button
							type="button"
							onClick={() => onViewModeChange("cards")}
							aria-label={t("list.viewCards", "Ver como cards")}
							aria-pressed={viewMode === "cards"}
							className={cn(
								"flex h-6 w-6 items-center justify-center rounded transition-colors cursor-pointer",
								viewMode === "cards"
									? "bg-surface-low text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<LayoutGrid className="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							onClick={() => onViewModeChange("list")}
							aria-label={t("list.viewList", "Ver como lista")}
							aria-pressed={viewMode === "list"}
							className={cn(
								"flex h-6 w-6 items-center justify-center rounded transition-colors cursor-pointer",
								viewMode === "list"
									? "bg-surface-low text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<List className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<input
							ref={searchInputRef}
							type="text"
							value={query}
							onChange={(event) => onQueryChange(event.target.value)}
							placeholder={t("list.searchPlaceholder", "Buscar ambiente...")}
							className="h-8 w-full rounded-lg bg-surface-high/80 pl-8 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:bg-surface-high focus:ring-1 focus:ring-primary/40"
						/>
						<kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-surface-low px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							{isMac ? "⌘K" : "Ctrl K"}
						</kbd>
					</div>

					<button
						type="button"
						onClick={onCreate}
						aria-label={t("list.newRoom", "Novo ambiente")}
						title={t("list.newRoom", "Novo ambiente")}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high/80 text-muted-foreground transition-colors hover:bg-surface-highest hover:text-primary cursor-pointer"
					>
						<Plus className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Lista de Ambientes */}
			{/* biome-ignore lint/a11y/useSemanticElements: container só encaminha ArrowUp/Down pro item focado, não é um form <fieldset> */}
			<div
				ref={containerRef}
				role="group"
				aria-label={t("list.ariaList", "Lista de ambientes")}
				onKeyDown={handleKeyDown}
				className={cn(
					"flex-1 overflow-y-auto scrollbar-thin p-3",
					viewMode === "cards" ? "space-y-2" : "space-y-1",
				)}
			>
				{rooms.length === 0 ? (
					<p className="p-4 text-center text-xs text-muted-foreground">
						{t("list.empty", "Nenhum ambiente encontrado.")}
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

				{/* Ação rápida de adicionar com surface pura */}
				<button
					type="button"
					onClick={onCreate}
					className="group flex h-16 w-full items-center gap-4 rounded-lg bg-surface-container/40 p-4 text-left transition-all hover:bg-surface-container cursor-pointer"
				>
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-high text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
						<Plus className="h-4 w-4" />
					</span>
					<div className="flex flex-col">
						<span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
							{t("list.addRoom", "Adicionar Ambiente")}
						</span>
						<span className="text-xs text-muted-foreground">
							{t("list.addRoomSubtitle", "Criar um novo cômodo")}
						</span>
					</div>
				</button>
			</div>
		</div>
	);
}
