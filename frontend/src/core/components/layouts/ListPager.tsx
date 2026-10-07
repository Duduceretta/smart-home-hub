import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/core/utils";

const BUTTON_CLASSNAME =
	"flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg border px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40";

/** Até 7 páginas aparecem todas; acima disso: primeira, última e uma janela de 3 em volta da atual. */
const ALL_PAGES_LIMIT = 7;
const WINDOW_SIZE = 3;

export type PageItem = number | "gap-start" | "gap-end";

/** Números de página a mostrar (de 1 em diante), com `"gap-*"` onde há reticências. */
export function pageItems(page: number, totalPages: number): PageItem[] {
	if (totalPages <= ALL_PAGES_LIMIT) {
		return Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1);
	}

	const start = Math.min(Math.max(page - 1, 2), totalPages - WINDOW_SIZE);
	const middle = Array.from({ length: WINDOW_SIZE }, (_, i) => start + i);
	const end = start + WINDOW_SIZE - 1;

	return [
		1,
		...(start > 2 ? (["gap-start"] as const) : []),
		...middle,
		...(end < totalPages - 1 ? (["gap-end"] as const) : []),
		totalPages,
	];
}

export interface ListPagerLabels {
	nav: string;
	first: string;
	previous: string;
	next: string;
	last: string;
	goToPage: (page: number) => string;
}

interface ListPagerProps {
	/** Página atual, de 1 em diante. */
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	/** Texto à esquerda, ex.: "Mostrando 1–10 de 27 cenas". */
	summary: ReactNode;
	labels: ListPagerLabels;
	/** Estilo do botão da página atual (cada tela escolhe o destaque). */
	activeStyle?: CSSProperties;
	className?: string;
}

/**
 * Card de paginação de listas: resumo à esquerda e « ‹ 1 2 3 › » à direita. Fica
 * visível mesmo com uma página só (setas desabilitadas), para a lista não mudar de
 * altura quando um filtro reduz o resultado.
 */
export function ListPager({
	page,
	totalPages,
	onPageChange,
	summary,
	labels,
	activeStyle,
	className,
}: ListPagerProps) {
	const lastPage = Math.max(1, totalPages);

	const arrow = (
		target: number,
		Icon: typeof ChevronLeft,
		label: string,
		disabled: boolean,
	) => (
		<button
			type="button"
			aria-label={label}
			disabled={disabled}
			onClick={() => onPageChange(target)}
			className={cn(
				BUTTON_CLASSNAME,
				"border-border-subtle bg-surface-high text-foreground hover:bg-surface-highest",
			)}
		>
			<Icon className="h-4 w-4" />
		</button>
	);

	return (
		<nav
			aria-label={labels.nav}
			className={cn(
				"flex h-[4.625rem] items-center justify-between rounded-xl border border-border-subtle bg-surface-container px-4",
				className,
			)}
		>
			<span className="text-sm text-muted-foreground">{summary}</span>
			<div className="flex items-center gap-1.5">
				{arrow(1, ChevronsLeft, labels.first, page <= 1)}
				{arrow(page - 1, ChevronLeft, labels.previous, page <= 1)}
				{pageItems(page, lastPage).map((item) =>
					typeof item === "string" ? (
						<span key={item} aria-hidden className="px-1 text-muted-foreground">
							…
						</span>
					) : (
						<button
							key={item}
							type="button"
							aria-label={labels.goToPage(item)}
							aria-current={item === page ? "page" : undefined}
							onClick={() => onPageChange(item)}
							style={item === page ? activeStyle : undefined}
							className={cn(
								BUTTON_CLASSNAME,
								item === page
									? "border-transparent bg-primary text-primary-foreground"
									: "border-border-subtle bg-surface-high text-foreground hover:bg-surface-highest",
							)}
						>
							{item}
						</button>
					),
				)}
				{arrow(page + 1, ChevronRight, labels.next, page >= lastPage)}
				{arrow(lastPage, ChevronsRight, labels.last, page >= lastPage)}
			</div>
		</nav>
	);
}
