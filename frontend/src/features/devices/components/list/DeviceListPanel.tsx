import {
	ChevronLeft,
	ChevronRight,
	Cpu,
	LayoutGrid,
	List,
	Plus,
	Search,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { cn } from "@/core/utils";
import { useDevices } from "../../hooks/useDevices";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import { DeviceListItem } from "./DeviceListItem";

const PAGE_SIZE = 20;

const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

interface PaginationControlsProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

function PaginationControls({
	page,
	totalPages,
	onPageChange,
}: PaginationControlsProps) {
	const { t } = useTranslation("devices");

	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-between pt-2">
			<span className="text-xs text-muted-foreground">
				{t("grid.pageIndicator", "Página {{page}} de {{totalPages}}", {
					page,
					totalPages,
				})}
			</span>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
					aria-label={t("grid.previousPage", "Página anterior")}
					className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-high text-muted-foreground transition-colors hover:bg-surface-highest hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronLeft className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
					aria-label={t("grid.nextPage", "Próxima página")}
					className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-high text-muted-foreground transition-colors hover:bg-surface-highest hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronRight className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}

interface DeviceListPanelProps {
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onCreate: () => void;
}

/**
 * Coluna esquerda do split-view de Dispositivos — mesmo wrapper/estrutura do
 * `RoomListPanel` (feature `rooms`): busca com Ctrl+K/⌘K, segmented control
 * cards/lista, scrollbar oculta. Reúne o que antes vivia em
 * `DevicesToolbar.tsx` (busca, toggle de visualização) e `DevicesGrid.tsx`
 * (busca paginada + paginação), ambos removidos. O filtro por ambiente saiu
 * daqui — agora é a `DeviceRoomFilterRail` ao lado, mesmo padrão de trilha
 * de `AutomationFilterRail` (feature `automations`); `selectedRoomId` segue
 * lido direto da store aqui só pra alimentar a query de `useDevices`.
 */
export function DeviceListPanel({
	selectedId,
	onSelect,
	onCreate,
}: DeviceListPanelProps) {
	const { t } = useTranslation("devices");
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const {
		query,
		setQuery,
		activeTab,
		statusFilter,
		selectedRoomId,
		onlyOn,
		viewMode,
		setViewMode,
		page,
		setPage,
	} = useDevicesUIStore();

	const debouncedQuery = useDebouncedValue(query, 300);

	// Busca e filtros (cômodo, apenas ligados, categoria, status) e
	// paginação todos resolvidos server-side — digitar na busca dispara a
	// mesma query contra o backend (via param `q`), não filtra em memória.
	const { data, isLoading } = useDevices({
		query: debouncedQuery,
		category: activeTab,
		status: statusFilter,
		roomId: selectedRoomId,
		onlyOn,
		page,
		pageSize: PAGE_SIZE,
	});

	const devices = data?.items ?? [];
	const totalPages = data?.totalPages ?? 1;
	const totalCount = data?.totalCount ?? 0;

	// Auto-seleção do primeiro item ao carregar/filtrar — mesmo padrão de
	// `RoomsView` (feature `rooms`).
	useEffect(() => {
		if (isLoading) return;
		if (selectedId === null && devices.length > 0) {
			onSelect(devices[0].id);
		} else if (
			selectedId !== null &&
			!devices.some((device) => device.id === selectedId)
		) {
			onSelect(devices[0]?.id ?? null);
		}
	}, [isLoading, devices, selectedId, onSelect]);

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
			container.querySelectorAll<HTMLElement>("[data-device-item]"),
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
			<div className="flex shrink-0 flex-col gap-2.5 bg-surface-container/50 p-3">
				<div className="flex items-center justify-between">
					<span className="pl-1.5 text-sm font-semibold tracking-wide text-foreground">
						{t(
							"list.count",
							`${totalCount} dispositivo${totalCount === 1 ? "" : "s"}`,
							{
								count: totalCount,
							},
						)}
					</span>

					{/* biome-ignore lint/a11y/useSemanticElements: segmented control de 2 botões, não um form <fieldset> */}
					<div
						role="group"
						aria-label={t("toolbar.viewModeLabel", "Modo de visualização")}
						className="flex items-center gap-0.5 rounded-md bg-surface-high/60 p-0.5"
					>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							aria-label={t("toolbar.viewModeGrid", "Visualização em grade")}
							aria-pressed={viewMode === "grid"}
							className={cn(
								"flex h-6 w-6 items-center justify-center rounded transition-colors cursor-pointer",
								viewMode === "grid"
									? "bg-surface-low text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<LayoutGrid className="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							aria-label={t("toolbar.viewModeList", "Visualização em lista")}
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
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t("toolbar.searchPlaceholder", "Buscar...")}
							aria-label={t("toolbar.searchAriaLabel", "Buscar dispositivo")}
							className="h-8 w-full rounded-lg bg-surface-high/80 pl-8 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:bg-surface-high focus:ring-1 focus:ring-primary/40"
						/>
						<kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-surface-low px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							{isMac ? "⌘K" : "Ctrl K"}
						</kbd>
					</div>

					<button
						type="button"
						onClick={onCreate}
						aria-label={t("header.addButton", "Novo Dispositivo")}
						title={t("header.addButton", "Novo Dispositivo")}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high/80 text-muted-foreground transition-colors hover:bg-surface-highest hover:text-primary cursor-pointer"
					>
						<Plus className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* biome-ignore lint/a11y/useSemanticElements: container só encaminha ArrowUp/Down pro item focado, não é um form <fieldset> */}
			<div
				ref={containerRef}
				role="group"
				aria-label={t("list.ariaList", "Lista de dispositivos")}
				onKeyDown={handleKeyDown}
				className="flex-1 overflow-y-auto scrollbar-thin p-3"
			>
				{isLoading ? (
					<div className="flex flex-col gap-2 animate-pulse">
						{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((sk) => (
							<div key={sk} className="h-14 rounded-lg bg-surface-container" />
						))}
					</div>
				) : devices.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
						<Cpu className="h-5 w-5 text-muted-foreground" />
						<p className="text-xs text-muted-foreground">
							{t("grid.emptyTitle", "Nenhum dispositivo encontrado")}
						</p>
					</div>
				) : (
					<div
						className={cn(
							"flex flex-col",
							viewMode === "grid" ? "gap-2" : "gap-1",
						)}
					>
						{devices.map((device) => (
							<DeviceListItem
								key={device.id}
								device={device}
								isSelected={device.id === selectedId}
								onSelect={onSelect}
								viewMode={viewMode}
							/>
						))}
					</div>
				)}

				<PaginationControls
					page={page}
					totalPages={totalPages}
					onPageChange={setPage}
				/>
			</div>
		</div>
	);
}
