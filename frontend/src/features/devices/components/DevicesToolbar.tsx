import { FilterX, LayoutGrid, List, Search, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { useDevicesUIStore } from "../store/devices-ui.store";

export const DevicesToolbar: React.FC = () => {
	const { t } = useTranslation(["devices", "common"]);
	const inputRef = useRef<HTMLInputElement>(null);
	const { data: rooms = [] } = useRooms();

	const {
		query,
		setQuery,
		activeTab,
		statusFilter,
		selectedRoomId,
		setSelectedRoomId,
		onlyOn,
		viewMode,
		setViewMode,
		resetFilters,
	} = useDevicesUIStore();

	const isFilterActive =
		query !== "" ||
		activeTab !== "Todos" ||
		statusFilter !== null ||
		selectedRoomId !== null ||
		onlyOn;

	// Atalho global: ⌘K / Ctrl+K ou / para focar a barra de pesquisa
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const activeTag = document.activeElement?.tagName.toLowerCase();
			const isInputFocused = activeTag === "input" || activeTag === "textarea";

			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			} else if (e.key === "/" && !isInputFocused) {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div
			role="toolbar"
			aria-label={t("toolbar.ariaLabel", "Barra de ferramentas e filtros")}
			className="flex flex-wrap items-center justify-between gap-4"
		>
			{/* 1. Filtro por Cômodos (Pills) + Limpar Filtros */}
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{rooms.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{t(
							"toolbar.roomFilterEmpty",
							"Seus filtros por cômodos aparecerão aqui quando você tiver cômodos registrados.",
						)}
					</p>
				) : (
					<fieldset className="flex items-center gap-2 overflow-x-auto py-1 border-0 p-0 m-0 scrollbar-none">
						<legend className="sr-only">
							{t("toolbar.roomFilterAriaLabel", "Filtrar por cômodo")}
						</legend>
						{/* Pílula: Todos */}
						<button
							type="button"
							aria-pressed={selectedRoomId === null}
							onClick={() => setSelectedRoomId(null)}
							className={`shrink-0 h-8 rounded-full px-4 text-sm font-medium transition-all shadow-sm ${
								selectedRoomId === null
									? "bg-primary/20 text-primary ring-1 ring-primary/50"
									: "bg-surface-container text-muted-foreground hover:bg-surface-high hover:text-foreground"
							}`}
						>
							{t("toolbar.roomFilterAll", "Todos")}
						</button>

						{/* Pílulas de Cada Cômodo */}
						{rooms.map((room) => {
							const isSelected = selectedRoomId === room.id;
							return (
								<button
									key={room.id}
									type="button"
									aria-pressed={isSelected}
									onClick={() => setSelectedRoomId(room.id)}
									className={`shrink-0 h-8 rounded-full px-4 text-sm font-medium transition-all shadow-sm ${
										isSelected
											? "bg-primary/20 text-primary ring-1 ring-primary/50"
											: "bg-surface-container text-muted-foreground hover:bg-surface-high hover:text-foreground"
									}`}
								>
									{room.name}
								</button>
							);
						})}
					</fieldset>
				)}

				{isFilterActive && (
					<button
						type="button"
						onClick={resetFilters}
						className="flex shrink-0 items-center h-8 gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer"
					>
						<FilterX className="h-3.5 w-3.5" />
						{t("grid.clearFilters", "Limpar filtros")}
					</button>
				)}
			</div>

			{/* 2. Ações do Lado Direito: Busca + Toggle Grade/Lista */}
			<div className="flex items-center gap-4">
				{/* Campo de Busca Expansível */}
				<div className="relative flex items-center">
					<Search
						className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none"
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t("toolbar.searchPlaceholder", "Buscar...")}
						aria-label={t("toolbar.searchAriaLabel", "Buscar dispositivos")}
						className="w-44 h-8 rounded-full bg-surface-low pl-9 pr-14 text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all duration-300 focus:w-60 focus:ring-1 focus:ring-primary"
					/>
					{query ? (
						<button
							type="button"
							onClick={() => setQuery("")}
							aria-label={t("toolbar.clearSearchAriaLabel", "Limpar busca")}
							className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					) : (
						<kbd className="pointer-events-none absolute right-2 flex h-5 items-center justify-center rounded-sm bg-surface-container px-2 font-mono text-xs text-muted-foreground">
							Ctrl+K
						</kbd>
					)}
				</div>

				{/* Segmented Control (Grade / Lista) */}
				<fieldset className="flex items-center gap-1 rounded-lg bg-surface-low p-1 border-0 m-0">
					<legend className="sr-only">
						{t("toolbar.viewModeLabel", "Modo de visualização")}
					</legend>
					<button
						type="button"
						aria-pressed={viewMode === "grid"}
						aria-label={t("toolbar.viewModeGrid", "Visualização em grade")}
						onClick={() => setViewMode("grid")}
						className={`rounded-md p-1.5 transition-colors ${
							viewMode === "grid"
								? "bg-surface-high text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<LayoutGrid className="h-4 w-4" />
					</button>
					<button
						type="button"
						aria-pressed={viewMode === "list"}
						aria-label={t("toolbar.viewModeList", "Visualização em lista")}
						onClick={() => setViewMode("list")}
						className={`rounded-md p-1.5 transition-colors ${
							viewMode === "list"
								? "bg-surface-high text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<List className="h-4 w-4" />
					</button>
				</fieldset>
			</div>
		</div>
	);
};
