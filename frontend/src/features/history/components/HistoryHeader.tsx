import {
	ArrowLeft,
	ChevronsDownUp,
	ChevronsUpDown,
	Download,
	FileJson,
	FileSpreadsheet,
	RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
 * Contains return navigation button, page title, subtitle, expand/collapse all toggle, manual refresh, and log export actions.
 */
export function HistoryHeader({
	events,
	isRefetching = false,
	expandedCount,
	onRefresh,
	onToggleExpandAll,
}: HistoryHeaderProps) {
	const { t } = useTranslation("history");
	const location = useLocation();
	const navigate = useNavigate();

	const returnTo = (location.state as { returnTo?: string })?.returnTo;
	const returnLabel = (location.state as { returnLabel?: string })?.returnLabel;
	const areAllExpanded = events.length > 0 && expandedCount >= events.length;

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-col gap-1">
				{returnTo && (
					<button
						type="button"
						onClick={() => navigate(returnTo)}
						className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-1"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						{returnLabel
							? t("actions.returnTo", { label: returnLabel })
							: t("actions.return", "Voltar")}
					</button>
				)}
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

			<div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center">
				{/* Toggle Expand / Collapse All */}
				<Button
					variant="outline"
					size="sm"
					onClick={onToggleExpandAll}
					disabled={events.length === 0}
					aria-label={
						areAllExpanded
							? t("actions.collapseAll", "Recolher todos")
							: t("actions.expandAll", "Expandir todos")
					}
					className="h-11 sm:h-8 border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer transition-colors px-2.5 sm:px-3 justify-center"
					title={
						areAllExpanded
							? t("actions.collapseAll", "Recolher todos")
							: t("actions.expandAll", "Expandir todos")
					}
				>
					{areAllExpanded ? (
						<>
							<ChevronsDownUp className="h-4 w-4 sm:mr-1.5 text-muted-foreground shrink-0" />
							<span className="hidden sm:inline">
								{t("actions.collapseAll", "Recolher todos")}
							</span>
						</>
					) : (
						<>
							<ChevronsUpDown className="h-4 w-4 sm:mr-1.5 text-muted-foreground shrink-0" />
							<span className="hidden sm:inline">
								{t("actions.expandAll", "Expandir todos")}
							</span>
						</>
					)}
				</Button>

				{/* Refresh Button */}
				<Button
					variant="outline"
					size="sm"
					onClick={onRefresh}
					disabled={isRefetching}
					aria-label={t("actions.refresh", "Atualizar")}
					title={t("actions.refresh", "Atualizar")}
					className="h-11 sm:h-8 border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer transition-colors px-2.5 sm:px-3 justify-center"
				>
					<RefreshCw
						className={`h-4 w-4 sm:mr-1.5 shrink-0 ${isRefetching ? "animate-spin text-primary" : ""}`}
					/>
					<span className="hidden sm:inline">
						{t("actions.refresh", "Atualizar")}
					</span>
				</Button>

				{/* Export Menu */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={events.length === 0}
							aria-label={t("actions.export", "Exportar Logs")}
							title={t("actions.export", "Exportar Logs")}
							className="h-11 sm:h-8 border-border-subtle bg-surface-container hover:bg-surface-high text-foreground cursor-pointer transition-colors px-2.5 sm:px-3 justify-center"
						>
							<Download className="h-4 w-4 sm:mr-1.5 shrink-0" />
							<span className="hidden sm:inline">
								{t("actions.export", "Exportar Logs")}
							</span>
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
