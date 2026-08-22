import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Empty state honesto — não existe feature de automações no backend ainda,
 * então não há dado real para listar aqui (nada de rotinas fake).
 */
export function ActiveAutomationsCard() {
	const { t } = useTranslation("dashboard");

	return (
		<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-5 flex flex-col items-center justify-center gap-2 text-center flex-1">
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#201f20] text-[#c7c6cb]">
				<Radio className="h-5 w-5" />
			</div>
			<p className="text-sm font-medium text-[#e5e2e2]">
				{t("automations.emptyTitle", "Nenhuma automação configurada ainda")}
			</p>
			<p className="max-w-xs text-xs text-[#c7c6cb]">
				{t(
					"automations.emptySubtitle",
					"Rotinas e automações vão aparecer aqui assim que essa feature estiver disponível.",
				)}
			</p>
		</div>
	);
}
