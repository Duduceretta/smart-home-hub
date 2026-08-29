import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DashboardTopBar() {
	const { t } = useTranslation("dashboard");

	return (
		<header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					{t("header.title")}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{t("header.subtitle")}
				</p>
			</div>

			<div className="flex w-fit items-center gap-2.5 rounded-full border border-border-subtle bg-surface-container px-3.5 py-1.5 shadow-xs">
				<span className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
				</span>
				<span className="text-xs font-semibold text-foreground">
					{t("header.hubStatus", "Hub Online")}
				</span>
				<span className="flex items-center gap-1.5 border-l border-border-subtle pl-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
					<Radio className="h-3 w-3 text-emerald-500" />
					{t("header.realtimeLabel", "TEMPO REAL")}
				</span>
			</div>
		</header>
	);
}
