import { LayoutGrid, List, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
	/**
	 * Assinatura de filtro/busca/ordenação vinda do pai — usada só pra saber
	 * QUANDO reiniciar a paginação pro topo. Não usar a referência de
	 * `automations` pra isso: ela muda a cada toggle/duplicar/criar (o
	 * array é recriado), o que reiniciaria o scroll incremental toda vez
	 * que qualquer automação mudasse de estado, não só quando o resultado
	 * filtrado realmente muda.
	 */
	resetKey: string;
}

/**
 * Tamanho do lote carregado por vez. A base mockada tem ~13 itens — 6
 * deixava só metade visível na primeira tela, dando impressão de lista
 * incompleta/quebrada em vez de scroll incremental. 10 preenche a
 * primeira tela quase inteira e ainda sobra pra ver o carregamento do
 * segundo lote disparar.
 */
const BATCH_SIZE = 10;
const LOAD_MORE_ROOT_MARGIN = "200px";
const SIMULATED_LATENCY_MS = 350;

/**
 * Coluna esquerda do split-view — tem scroll próprio contido (não a página
 * inteira): com scroll infinito, uma página que rolasse por inteiro
 * obrigaria a rolar uma distância enorme pra voltar ao topo depois de
 * carregar muitos lotes. Com scroll contido nessa altura fixa, voltar ao
 * topo da lista é sempre instantâneo. O carregamento incremental usa
 * IntersectionObserver com `root` apontando pro próprio container rolável
 * (não a viewport da página) — dispara só quando o sentinel entra na área
 * visível DESSE container specificamente.
 */
export function AutomationListPanel({
	automations,
	selectedId,
	onSelect,
	viewMode,
	onViewModeChange,
	onToggle,
	resetKey,
}: AutomationListPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Reseta a paginação só quando filtro/busca/ordenação mudam de verdade
	// (ver comentário de `resetKey` na prop) — não a cada mutação dos dados.
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetKey não é lido no corpo de propósito — só dispara o reset quando muda, padrão comum de "reset on change"
	useEffect(() => {
		setVisibleCount(BATCH_SIZE);
	}, [resetKey]);

	const visibleAutomations = automations.slice(0, visibleCount);
	const hasMore = visibleCount < automations.length;
	const hasMoreRef = useRef(hasMore);
	hasMoreRef.current = hasMore;
	const isLoadingMoreRef = useRef(isLoadingMore);
	isLoadingMoreRef.current = isLoadingMore;
	const totalCountRef = useRef(automations.length);
	totalCountRef.current = automations.length;

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
				setIsLoadingMore(true);
				setTimeout(() => {
					setVisibleCount((count) =>
						Math.min(count + BATCH_SIZE, totalCountRef.current),
					);
					setIsLoadingMore(false);
				}, SIMULATED_LATENCY_MS);
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
		<div className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-lg border border-border-subtle/20 bg-surface-low">
			<div className="flex shrink-0 items-center justify-between border-b border-border-subtle/20 px-3 py-2.5">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					{automations.length} automaç{automations.length === 1 ? "ão" : "ões"}
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
				aria-label="Lista de automações"
				onKeyDown={handleKeyDown}
				className={cn(
					"flex-1 overflow-y-auto scrollbar-thin",
					viewMode === "cards" ? "space-y-2 p-3" : "",
				)}
			>
				{automations.length === 0 ? (
					<p className="p-4 text-center text-xs text-muted-foreground">
						Nenhuma automação encontrada.
					</p>
				) : viewMode === "cards" ? (
					visibleAutomations.map((automation) => (
						<AutomationCard
							key={automation.id}
							automation={automation}
							isSelected={automation.id === selectedId}
							onSelect={onSelect}
							onToggle={onToggle}
						/>
					))
				) : (
					visibleAutomations.map((automation) => (
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
							"flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground",
							viewMode === "cards"
								? "py-3"
								: "h-11 border-b border-border-subtle/10",
						)}
					>
						<Loader2 className="h-3 w-3 animate-spin" />
						Carregando mais...
					</div>
				)}

				<div ref={sentinelRef} aria-hidden className="h-px" />
			</div>
		</div>
	);
}
