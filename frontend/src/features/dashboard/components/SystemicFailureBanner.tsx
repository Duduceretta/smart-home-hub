import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";

interface SystemicFailureBannerProps {
	onRetryAll: () => void;
}

/**
 * Único ponto do Dashboard onde `border-destructive`/`text-destructive` é
 * apropriado (seção 12.2/12.3 de `ui-and-design-system.md`) — a severidade
 * aqui é real e confirmada: 2+ queries independentes falhando ao mesmo
 * tempo, sintoma de outage de rede/backend, não de bug isolado num
 * endpoint. Consolida a ação de retry num único botão em vez de deixar
 * cada card mostrar seu próprio alerta com seu próprio botão.
 */
export function SystemicFailureBanner({
	onRetryAll,
}: SystemicFailureBannerProps) {
	const { t } = useTranslation("dashboard");

	return (
		<div
			role="alert"
			className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
		>
			<div className="flex items-center gap-2.5">
				<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
				<p className="text-sm font-medium text-destructive">
					{t("systemicFailure.title", "Não foi possível conectar ao servidor")}
				</p>
			</div>
			<Button variant="destructive" size="sm" onClick={onRetryAll}>
				{t("common:actions.retry", "Tentar novamente")}
			</Button>
		</div>
	);
}
