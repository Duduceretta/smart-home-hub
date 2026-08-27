import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DashboardTopBar() {
	const { t } = useTranslation("dashboard");

	return (
		<header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					{t("header.title")}
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					{t("header.subtitle")}
				</p>
			</div>

			<div className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface-container px-4 py-2 w-fit">
				<span className="relative flex h-2.5 w-2.5">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
					<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
				</span>
				<span className="text-xs font-medium text-foreground">
					{t("header.hubStatus", "Hub Online")}
				</span>
				<span className="flex items-center gap-1 text-xs font-medium tracking-wider text-primary border-l border-border-subtle/30 pl-3">
					<Radio className="w-3 h-3" />
					{t("header.realtimeLabel", "TEMPO REAL")}
				</span>
			</div>
		</header>
	);
}
