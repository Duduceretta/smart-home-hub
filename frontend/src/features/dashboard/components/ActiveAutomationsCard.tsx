import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Empty state honesto — não existe feature de automações no backend ainda,
 * então não há dado real para listar aqui (nada de rotinas fake).
 */
export function ActiveAutomationsCard() {
	const { t } = useTranslation("dashboard");

	return (
		<div className="rounded-xl border border-border-subtle/20 bg-surface-container p-4 flex flex-col items-center justify-center gap-2 text-center flex-1 transition-all duration-200 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
				<Radio className="h-5 w-5" />
			</div>
			<p className="text-sm font-medium text-foreground">
				{t("automations.emptyTitle", "Nenhuma automação configurada ainda")}
			</p>
			<p className="max-w-xs text-xs text-muted-foreground">
				{t(
					"automations.emptySubtitle",
					"Rotinas e automações vão aparecer aqui assim que essa feature estiver disponível.",
				)}
			</p>
		</div>
	);
}
