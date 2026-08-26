import { Bot, Plus, SearchX } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAutomations } from "../hooks/useAutomations";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import { AutomationCard } from "./AutomationCard";

const AutomationCardSkeleton = () => (
	<div className="relative flex h-48 flex-col justify-between rounded-xl border border-border-subtle/20 bg-surface-container p-5 animate-pulse">
		<div className="mb-4 flex items-start justify-between">
			<div className="h-12 w-12 rounded-full bg-surface-high" />
			<div className="h-6 w-6 rounded-md bg-surface-high" />
		</div>
		<div className="flex flex-1 flex-col gap-2">
			<div className="h-5 w-3/4 rounded bg-surface-high" />
			<div className="h-3 w-1/2 rounded bg-surface-high/60" />
		</div>
		<div className="mt-4 flex gap-2 border-t border-border-subtle/20 pt-3">
			<div className="h-4 w-20 rounded bg-surface-high/60" />
		</div>
	</div>
);

export const AutomationsGrid: React.FC = () => {
	const { t } = useTranslation("automations");
	const { data: automations = [], isLoading, isError } = useAutomations();
	const { query, openCreateSheet, resetFilters } = useAutomationsUIStore();

	const filteredAutomations = useMemo(() => {
		if (!query.trim()) return automations;
		const searchLower = query.toLowerCase().trim();
		return automations.filter((automation) =>
			automation.name.toLowerCase().includes(searchLower),
		);
	}, [automations, query]);

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<AutomationCardSkeleton />
				<AutomationCardSkeleton />
				<AutomationCardSkeleton />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-alert/50 bg-alert/20 p-12 text-center">
				<p className="text-sm font-medium text-alert-foreground">
					{t("grid.errorTitle")}
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					{t("grid.errorSubtitle")}
				</p>
			</div>
		);
	}

	if (filteredAutomations.length === 0 && query.trim() !== "") {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle/40 bg-surface-low p-12 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
					<SearchX className="h-6 w-6" />
				</div>
				<h3 className="mt-4 text-sm font-medium text-foreground">
					{t("grid.searchEmptyTitle")}
				</h3>
				<p className="mt-1 max-w-sm text-xs text-muted-foreground">
					{t("grid.searchEmptySubtitle", { query })}
				</p>
				<button
					type="button"
					onClick={resetFilters}
					className="mt-4 text-xs font-medium text-primary underline hover:text-primary/80 cursor-pointer"
				>
					{t("grid.clearSearch")}
				</button>
			</div>
		);
	}

	if (automations.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle/40 bg-surface-low p-12 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Bot className="h-6 w-6" />
				</div>
				<h3 className="mt-4 text-base font-semibold text-foreground">
					{t("grid.emptyTitle")}
				</h3>
				<p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
					{t("grid.emptySubtitle")}
				</p>
				<button
					type="button"
					onClick={openCreateSheet}
					className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					{t("grid.emptyCta")}
				</button>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{filteredAutomations.map((automation) => (
				<AutomationCard key={automation.id} automation={automation} />
			))}
		</div>
	);
};
