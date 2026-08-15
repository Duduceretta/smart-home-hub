import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DashboardHeader() {
	const { t } = useTranslation("dashboard");

	return (
		<header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-zinc-50">
					{t("header.title")}
				</h1>
				<p className="text-sm text-zinc-400 mt-1">{t("header.subtitle")}</p>
			</div>
			<button
				type="button"
				className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors w-fit"
			>
				{t("header.periodFilter")}
				<ChevronDown className="w-4 h-4" />
			</button>
		</header>
	);
}
