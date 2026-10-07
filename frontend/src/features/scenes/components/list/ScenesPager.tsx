import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { COLOR_AMBER } from "../../constants/scene-colors";

const BUTTON_CLASSNAME =
	"flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg border px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40";

/** Até 7 páginas aparecem todas; acima disso: primeira, vizinhas da atual e última, com "…". */
const ALL_PAGES_LIMIT = 7;

type ArrowLabelKey =
	| "list.firstPage"
	| "list.prevPage"
	| "list.nextPage"
	| "list.lastPage";

type PageItem = number | "gap-start" | "gap-end";

export function pageItems(page: number, lastPage: number): PageItem[] {
	if (lastPage + 1 <= ALL_PAGES_LIMIT) {
		return Array.from({ length: lastPage + 1 }, (_, index) => index);
	}

	const start = Math.max(1, Math.min(page - 1, lastPage - 3));
	const end = Math.min(lastPage - 1, start + 2);
	const middle = Array.from({ length: end - start + 1 }, (_, i) => start + i);

	return [
		0,
		...(start > 1 ? (["gap-start"] as const) : []),
		...middle,
		...(end < lastPage - 1 ? (["gap-end"] as const) : []),
		lastPage,
	];
}

interface ScenesPagerProps {
	page: number;
	lastPage: number;
	from: number;
	to: number;
	total: number;
	onChange: (page: number) => void;
}

/** Card de paginação no fim da lista: faixa "1–11 de 27" e « ‹ 1 2 3 › ». */
export function ScenesPager({
	page,
	lastPage,
	from,
	to,
	total,
	onChange,
}: ScenesPagerProps) {
	const { t } = useTranslation("scenes");

	const arrow = (
		target: number,
		Icon: typeof ChevronLeft,
		labelKey: ArrowLabelKey,
		disabled: boolean,
	) => (
		<button
			type="button"
			aria-label={t(labelKey)}
			disabled={disabled}
			onClick={() => onChange(target)}
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
			aria-label={t("list.pagination")}
			className="flex h-[4.625rem] items-center justify-between rounded-xl border border-border-subtle bg-surface-container px-4"
		>
			<span className="text-sm text-muted-foreground">
				<Trans
					t={t}
					i18nKey="list.pageRange"
					values={{ from, to, total }}
					components={{
						strong: <strong className="font-semibold text-foreground" />,
					}}
				/>
			</span>
			<div className="flex items-center gap-1.5">
				{arrow(0, ChevronsLeft, "list.firstPage", page === 0)}
				{arrow(page - 1, ChevronLeft, "list.prevPage", page === 0)}
				{pageItems(page, lastPage).map((item) =>
					typeof item === "string" ? (
						<span key={item} aria-hidden className="px-1">
							…
						</span>
					) : (
						<button
							key={item}
							type="button"
							aria-label={t("list.goToPage", { page: item + 1 })}
							aria-current={item === page ? "page" : undefined}
							onClick={() => onChange(item)}
							style={
								item === page ? { backgroundColor: COLOR_AMBER } : undefined
							}
							className={cn(
								BUTTON_CLASSNAME,
								item === page
									? "border-transparent text-primary-foreground"
									: "border-border-subtle bg-surface-high text-foreground hover:bg-surface-highest",
							)}
						>
							{item + 1}
						</button>
					),
				)}
				{arrow(page + 1, ChevronRight, "list.nextPage", page === lastPage)}
				{arrow(lastPage, ChevronsRight, "list.lastPage", page === lastPage)}
			</div>
		</nav>
	);
}
