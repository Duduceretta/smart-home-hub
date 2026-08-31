import { Inbox, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { useHistoryUIStore } from "../store/history-ui.store";

interface HistoryEmptyStateProps {
	isError?: boolean;
	onRetry?: () => void;
}

/**
 * Empty and error state display for the History audit timeline.
 */
export function HistoryEmptyState({
	isError = false,
	onRetry,
}: HistoryEmptyStateProps) {
	const { t } = useTranslation("history");
	const resetFilters = useHistoryUIStore((s) => s.resetFilters);

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-12 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
					<Inbox className="h-6 w-6" />
				</div>
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold text-foreground">
						{t("timeline.errorTitle", "Erro ao carregar o histórico")}
					</h3>
					<p className="text-xs text-muted-foreground max-w-sm">
						{t(
							"timeline.errorDescription",
							"Não foi possível buscar a trilha de eventos do servidor.",
						)}
					</p>
				</div>
				{onRetry && (
					<Button
						variant="outline"
						size="sm"
						onClick={onRetry}
						className="mt-2 border-border-subtle bg-surface-container hover:bg-surface-high cursor-pointer"
					>
						{t("timeline.retry", "Tentar novamente")}
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-surface-container/30 p-12 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
				<Inbox className="h-6 w-6" />
			</div>
			<div className="flex flex-col gap-1">
				<h3 className="text-sm font-semibold text-foreground">
					{t("timeline.emptyTitle", "Nenhum evento encontrado")}
				</h3>
				<p className="text-xs text-muted-foreground max-w-md">
					{t(
						"timeline.emptyDescription",
						"Nenhum evento ou registro de auditoria corresponde aos filtros e período selecionados.",
					)}
				</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={resetFilters}
				className="mt-2 border-border-subtle bg-surface-container hover:bg-surface-high cursor-pointer"
			>
				<X className="h-3.5 w-3.5 mr-1.5" />
				<span>{t("actions.clearFilters", "Limpar filtros")}</span>
			</Button>
		</div>
	);
}
