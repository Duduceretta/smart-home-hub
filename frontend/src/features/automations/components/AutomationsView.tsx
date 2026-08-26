import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import { AutomationsGrid } from "./AutomationsGrid";
import { CreateAutomationSheet } from "./CreateAutomationSheet";
import { EditAutomationSheet } from "./EditAutomationSheet";

export const AutomationsView: React.FC = () => {
	const { t } = useTranslation("automations");
	const { query, setQuery, openCreateSheet } = useAutomationsUIStore();

	return (
		<div className="space-y-6 pb-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						{t("title")}
					</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						{t("header.subtitle")}
					</p>
				</div>

				<button
					type="button"
					onClick={openCreateSheet}
					className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					{t("header.addButton")}
				</button>
			</div>

			<div className="relative max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={t("toolbar.searchPlaceholder")}
					className="w-full rounded-xl border border-border-subtle/20 bg-surface-container py-2.5 pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
				/>
			</div>

			<AutomationsGrid />

			<CreateAutomationSheet />
			<EditAutomationSheet />
		</div>
	);
};
