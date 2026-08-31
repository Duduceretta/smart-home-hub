import { Download, FileJson, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import type { HistoryEvent } from "../types/history.types";
import {
	exportEventsAsCsv,
	exportEventsAsJson,
} from "../utils/exportHistoryLogs";

interface HistoryHeaderProps {
	events: HistoryEvent[];
	isRefetching?: boolean;
	onRefresh: () => void;
}

/**
 * Top header of the History page.
 * Contains the page title, summary description, and log export / manual refresh actions.
 */
export function HistoryHeader({
	events,
	isRefetching = false,
	onRefresh,
}: HistoryHeaderProps) {
	const { t } = useTranslation("history");

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{t("title", "Histórico de Eventos")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t(
						"subtitle",
						"Trilha de auditoria, execuções de automações e telemetria do sistema.",
					)}
				</p>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onRefresh}
					disabled={isRefetching}
					className="border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer"
				>
					<RefreshCw
						className={`h-4 w-4 mr-1.5 ${isRefetching ? "animate-spin text-primary" : ""}`}
					/>
					<span>{t("actions.refresh", "Atualizar")}</span>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={events.length === 0}
							className="border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer"
						>
							<Download className="h-4 w-4 mr-1.5" />
							<span>{t("actions.export", "Exportar Logs")}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="border-border-subtle bg-popover text-popover-foreground"
					>
						<DropdownMenuItem
							onClick={() => exportEventsAsJson(events)}
							className="cursor-pointer"
						>
							<FileJson className="h-4 w-4 mr-2 text-primary" />
							<span>{t("actions.exportJson", "Exportar como JSON")}</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => exportEventsAsCsv(events)}
							className="cursor-pointer"
						>
							<FileSpreadsheet className="h-4 w-4 mr-2 text-warm" />
							<span>{t("actions.exportCsv", "Exportar como CSV")}</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
