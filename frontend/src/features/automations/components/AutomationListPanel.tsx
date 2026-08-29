import { LayoutGrid, List, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/core/utils";
import type {
	AutomationView,
	AutomationViewMode,
} from "../types/automations.types";
import { AutomationCard } from "./AutomationCard";
import { AutomationRow } from "./AutomationRow";

interface AutomationListPanelProps {
	automations: AutomationView[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	viewMode: AutomationViewMode;
	onViewModeChange: (mode: AutomationViewMode) => void;
	onToggle: (id: string, nextValue: boolean) => void;
	onCreate: () => void;
	query: string;
	onQueryChange: (query: string) => void;
	/** Busca a próxima página no backend (`useInfiniteQuery.fetchNextPage`). */
	onLoadMore: () => void;
	hasMore: boolean;
	isLoadingMore: boolean;
	/**
	 * Assinatura de filtro/busca/ordenação vinda do pai — usada só pra saber
	 * QUANDO rolar a lista de volta pro topo. Não usar a referência de
	 * `automations` pra isso: ela muda a cada toggle/duplicar/criar (o
	 * array é recriado), o que rolaria a lista toda vez que qualquer
	 * automação mudasse de estado, não só quando o resultado filtrado
	 * realmente muda.
	 */
	resetKey: string;
}

const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

const LOAD_MORE_ROOT_MARGIN = "200px";

/**
 * Coluna esquerda do split-view — tem scroll próprio contido (não a página
 * inteira): com scroll infinito, uma página que rolasse por inteiro
 * obrigaria a rolar uma distância enorme pra voltar ao topo depois de
 * carregar muitos lotes. Com scroll contido nessa altura fixa, voltar ao
 * topo da lista é sempre instantâneo. O carregamento incremental usa
 * IntersectionObserver com `root` apontando pro próprio container rolável
 * (não a viewport da página) — dispara `onLoadMore` (busca de verdade no
 * backend, `fetchNextPage` do `useInfiniteQuery`) só quando o sentinel
 * entra na área visível DESSE container especificamente.
 */
export function AutomationListPanel({
	automations,
	selectedId,
	onSelect,
	viewMode,
	onViewModeChange,
	onToggle,
	onCreate,
	query,
	onQueryChange,
	onLoadMore,
	hasMore,
	isLoadingMore,
	resetKey,
}: AutomationListPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

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

	// Rola a lista de volta pro topo só quando filtro/busca/ordenação mudam
	// de verdade (ver comentário de `resetKey` na prop) — não a cada
	// mutação dos dados.
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetKey não é lido no corpo de propósito — só dispara o reset quando muda, padrão comum de "reset on change"
	useEffect(() => {
		containerRef.current?.scrollTo({ top: 0 });
	}, [resetKey]);

	const hasMoreRef = useRef(hasMore);
	hasMoreRef.current = hasMore;
	const isLoadingMoreRef = useRef(isLoadingMore);
	isLoadingMoreRef.current = isLoadingMore;
	const onLoadMoreRef = useRef(onLoadMore);
	onLoadMoreRef.current = onLoadMore;

	// Observer criado uma vez (sentinel é um nó estável no fim da lista) —
	// as checagens de hasMore/isLoadingMore usam refs pra sempre ler o
	// valor mais recente sem precisar recriar o observer a cada render.
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (
					!entry.isIntersecting ||
					isLoadingMoreRef.current ||
					!hasMoreRef.current
				) {
					return;
				}
				onLoadMoreRef.current();
			},
			{ root: containerRef.current, rootMargin: LOAD_MORE_ROOT_MARGIN },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
		const container = containerRef.current;
		if (!container) return;

		const items = Array.from(
			container.querySelectorAll<HTMLElement>("[data-automation-item]"),
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
			{/* Cabeçalho da Lista: Contador, Alternador de View e Busca */}
			<div className="flex shrink-0 flex-col gap-2.5 bg-surface-container/50 p-3">
				<div className="flex items-center justify-between">
					<span className="pl-1.5 text-sm font-semibold tracking-wide text-foreground">
						{automations.length} automaç
						{automations.length === 1 ? "ão" : "ões"}
					</span>

					{/* biome-ignore lint/a11y/useSemanticElements: segmented control de 2 botões */}
					<div
						role="group"
						aria-label="Modo de visualização da lista"
						className="flex items-center gap-0.5 rounded-md bg-surface-high/60 p-0.5"
					>
						<button
							type="button"
							onClick={() => onViewModeChange("cards")}
							aria-label="Ver como cards"
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
							aria-label="Ver como lista"
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
							placeholder="Buscar automação..."
							className="h-8 w-full rounded-lg bg-surface-high/80 pl-8 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:bg-surface-high focus:ring-1 focus:ring-primary/40"
						/>
						<kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-surface-low px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							{isMac ? "⌘K" : "Ctrl K"}
						</kbd>
					</div>

					<button
						type="button"
						onClick={onCreate}
						aria-label="Nova automação"
						title="Nova automação"
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high/80 text-muted-foreground transition-colors hover:bg-surface-highest hover:text-primary cursor-pointer"
					>
						<Plus className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Lista com Scroll */}
			{/* biome-ignore lint/a11y/useSemanticElements: container encaminha ArrowUp/Down */}
			<div
				ref={containerRef}
				role="group"
				aria-label="Lista de automações"
				onKeyDown={handleKeyDown}
				className={cn(
					"flex-1 overflow-y-auto scrollbar-thin p-3",
					viewMode === "cards" ? "space-y-2" : "space-y-1",
				)}
			>
				{automations.length === 0 ? (
					<p className="p-4 text-center text-xs text-muted-foreground">
						Nenhuma automação encontrada.
					</p>
				) : viewMode === "cards" ? (
					automations.map((automation) => (
						<AutomationCard
							key={automation.id}
							automation={automation}
							isSelected={automation.id === selectedId}
							onSelect={onSelect}
							onToggle={onToggle}
						/>
					))
				) : (
					automations.map((automation) => (
						<AutomationRow
							key={automation.id}
							automation={automation}
							isSelected={automation.id === selectedId}
							onSelect={onSelect}
							onToggle={onToggle}
						/>
					))
				)}

				{isLoadingMore && (
					<div
						className={cn(
							"flex items-center justify-center gap-1.5 text-xs text-muted-foreground",
							viewMode === "cards" ? "py-3" : "h-10",
						)}
					>
						<Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
						Carregando mais...
					</div>
				)}

				{/* Ghost Card para Criar Nova Automação — mesmo padrão de `RoomListPanel`
				no modo cards; no modo lista acompanha a densidade do `AutomationRow`
				(sem subtítulo, ícone/altura menores). */}
				<button
					type="button"
					onClick={onCreate}
					className={cn(
						"group flex w-full items-center gap-3 rounded-lg bg-surface-container/40 text-left transition-all hover:bg-surface-container cursor-pointer",
						viewMode === "cards" ? "h-16 gap-4 p-4" : "h-10 px-3 py-2",
					)}
				>
					<span
						className={cn(
							"flex shrink-0 items-center justify-center rounded-full bg-surface-high text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary",
							viewMode === "cards" ? "h-8 w-8" : "h-6 w-6",
						)}
					>
						<Plus
							className={viewMode === "cards" ? "h-4 w-4" : "h-3.5 w-3.5"}
						/>
					</span>
					{viewMode === "cards" ? (
						<div className="flex flex-col">
							<span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
								Adicionar Automação
							</span>
							<span className="text-xs text-muted-foreground">
								Criar uma nova regra
							</span>
						</div>
					) : (
						<span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
							Adicionar Automação
						</span>
					)}
				</button>

				<div ref={sentinelRef} aria-hidden className="h-px" />
			</div>
		</div>
	);
}
