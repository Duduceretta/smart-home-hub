import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";

interface HistoryPaginationProps {
	page: number;
	totalPages: number;
	totalCount: number;
	onPageChange: (page: number) => void;
}

/**
 * Pagination bar for the History audit timeline.
 */
export function HistoryPagination({
	page,
	totalPages,
	totalCount,
	onPageChange,
}: HistoryPaginationProps) {
	const { t } = useTranslation("history");

	if (totalPages <= 1) return null;

	return (
		<div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-low px-4 py-3 sm:flex-row shadow-xs">
			<span className="text-xs text-muted-foreground font-mono">
				{t("pagination.showing", {
					count: totalCount > 0 ? (page - 1) * 20 + 1 : 0,
					total: totalCount,
				})}
			</span>

			<div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
					aria-label={t("pagination.previous", "Anterior")}
					className="h-11 sm:h-8 px-3 text-xs border-border-subtle bg-surface-container hover:bg-surface-high cursor-pointer justify-center"
				>
					<ChevronLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1" />
					<span>{t("pagination.previous", "Anterior")}</span>
				</Button>

				<span className="text-xs font-medium text-foreground px-2">
					{t("pagination.page", { current: page, total: totalPages })}
				</span>

				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= totalPages}
					aria-label={t("pagination.next", "Próxima")}
					className="h-11 sm:h-8 px-3 text-xs border-border-subtle bg-surface-container hover:bg-surface-high cursor-pointer justify-center"
				>
					<span>{t("pagination.next", "Próxima")}</span>
					<ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5 ml-1" />
				</Button>
			</div>
		</div>
	);
}
