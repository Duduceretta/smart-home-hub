import {
	ChevronsDownUp,
	ChevronsUpDown,
	Download,
	FileJson,
	FileSpreadsheet,
	RefreshCw,
} from "lucide-react";
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
	expandedCount: number;
	onRefresh: () => void;
	onToggleExpandAll: () => void;
}

/**
 * Top header of the History page.
 * Contains page title, subtitle, expand/collapse all toggle, manual refresh, and log export actions.
 */
export function HistoryHeader({
	events,
	isRefetching = false,
	expandedCount,
	onRefresh,
	onToggleExpandAll,
}: HistoryHeaderProps) {
	const { t } = useTranslation("history");
	const areAllExpanded = events.length > 0 && expandedCount >= events.length;

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

			<div className="flex flex-wrap items-center gap-2">
				{/* Toggle Expand / Collapse All */}
				<Button
					variant="outline"
					size="sm"
					onClick={onToggleExpandAll}
					disabled={events.length === 0}
					className="border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer transition-colors"
					title={
						areAllExpanded
							? t("actions.collapseAll", "Recolher todos")
							: t("actions.expandAll", "Expandir todos")
					}
				>
					{areAllExpanded ? (
						<>
							<ChevronsDownUp className="h-4 w-4 mr-1.5 text-muted-foreground" />
							<span>{t("actions.collapseAll", "Recolher todos")}</span>
						</>
					) : (
						<>
							<ChevronsUpDown className="h-4 w-4 mr-1.5 text-muted-foreground" />
							<span>{t("actions.expandAll", "Expandir todos")}</span>
						</>
					)}
				</Button>

				{/* Refresh Button */}
				<Button
					variant="outline"
					size="sm"
					onClick={onRefresh}
					disabled={isRefetching}
					className="border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer transition-colors"
				>
					<RefreshCw
						className={`h-4 w-4 mr-1.5 ${isRefetching ? "animate-spin text-primary" : ""}`}
					/>
					<span>{t("actions.refresh", "Atualizar")}</span>
				</Button>

				{/* Export Menu */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={events.length === 0}
							className="border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer transition-colors"
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
