import { Calendar, Filter, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { useHistoryUIStore } from "../store/history-ui.store";
import type { HistoryTimeframePreset } from "../types/history.types";

/**
 * Filter bar for the History audit view.
 * Includes search input with Ctrl+K shortcut listener, Timeframe, Severity, Source filters, and reset action.
 */
export function HistoryFiltersBar() {
	const { t } = useTranslation("history");
	const inputRef = useRef<HTMLInputElement>(null);

	const searchQuery = useHistoryUIStore((s) => s.searchQuery);
	const selectedSeverity = useHistoryUIStore((s) => s.selectedSeverity);
	const selectedSource = useHistoryUIStore((s) => s.selectedSource);
	const timeframe = useHistoryUIStore((s) => s.timeframe);

	const setSearchQuery = useHistoryUIStore((s) => s.setSearchQuery);
	const setSelectedSeverity = useHistoryUIStore((s) => s.setSelectedSeverity);
	const setSelectedSource = useHistoryUIStore((s) => s.setSelectedSource);
	const setTimeframe = useHistoryUIStore((s) => s.setTimeframe);
	const resetFilters = useHistoryUIStore((s) => s.resetFilters);

	// Ctrl+K keyboard shortcut to focus search input
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const isDirty =
		Boolean(searchQuery) ||
		selectedSeverity !== "all" ||
		selectedSource !== "all" ||
		timeframe !== "7d";

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-low p-3.5">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				{/* Search Input with Ctrl+K badge */}
				<div className="relative flex-1">
					<Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						ref={inputRef}
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t(
							"filters.searchPlaceholder",
							"Buscar evento por descrição, dispositivo ou cômodo (Ctrl+K)...",
						)}
						aria-label={t("filters.searchLabel", "Buscar eventos")}
						className="h-10 w-full rounded-xl border border-border-subtle bg-surface-container pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
					/>
					<div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
						{searchQuery ? (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
								title="Limpar busca"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						) : (
							<kbd className="hidden rounded bg-surface-high px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-block border border-border-subtle">
								Ctrl K
							</kbd>
						)}
					</div>
				</div>

				{/* Inline Selects */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Timeframe selector */}
					<div className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-container px-3 h-10">
						<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<select
							value={timeframe}
							onChange={(e) =>
								setTimeframe(e.target.value as HistoryTimeframePreset)
							}
							aria-label={t("filters.timeframe", "Período")}
							className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-1"
						>
							<option value="24h" className="bg-popover text-foreground">
								{t("filters.periods.24h", "Últimas 24h")}
							</option>
							<option value="7d" className="bg-popover text-foreground">
								{t("filters.periods.7d", "Últimos 7 dias")}
							</option>
							<option value="30d" className="bg-popover text-foreground">
								{t("filters.periods.30d", "Últimos 30 dias")}
							</option>
							<option value="all" className="bg-popover text-foreground">
								{t("filters.periods.all", "Todo o histórico")}
							</option>
						</select>
					</div>

					{/* Severity filter */}
					<div className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-container px-3 h-10">
						<Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<select
							value={selectedSeverity}
							onChange={(e) => setSelectedSeverity(e.target.value)}
							aria-label={t("filters.severity", "Severidade")}
							className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-1"
						>
							<option value="all" className="bg-popover text-foreground">
								{t("filters.allSeverities", "Todas as severidades")}
							</option>
							<option value="Info" className="bg-popover text-foreground">
								{t("filters.severities.Info", "Info")}
							</option>
							<option value="Warning" className="bg-popover text-foreground">
								{t("filters.severities.Warning", "Aviso (Warning)")}
							</option>
							<option value="Error" className="bg-popover text-foreground">
								{t("filters.severities.Error", "Erro")}
							</option>
							<option value="Critical" className="bg-popover text-foreground">
								{t("filters.severities.Critical", "Crítico")}
							</option>
						</select>
					</div>

					{/* Source filter */}
					<div className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-container px-3 h-10">
						<select
							value={selectedSource}
							onChange={(e) => setSelectedSource(e.target.value)}
							aria-label={t("filters.source", "Origem")}
							className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-1"
						>
							<option value="all" className="bg-popover text-foreground">
								{t("filters.allSources", "Todas as origens")}
							</option>
							<option value="Automation" className="bg-popover text-foreground">
								{t("filters.sources.Automation", "Automação")}
							</option>
							<option
								value="DeviceGroup"
								className="bg-popover text-foreground"
							>
								{t("filters.sources.DeviceGroup", "Grupo")}
							</option>
							<option value="UserManual" className="bg-popover text-foreground">
								{t("filters.sources.UserManual", "Usuário")}
							</option>
							<option value="System" className="bg-popover text-foreground">
								{t("filters.sources.System", "Sistema")}
							</option>
						</select>
					</div>

					{/* Reset Filters button */}
					{isDirty && (
						<Button
							variant="ghost"
							size="sm"
							onClick={resetFilters}
							className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
						>
							<X className="h-3.5 w-3.5 mr-1" />
							<span>{t("actions.clearFilters", "Limpar filtros")}</span>
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
