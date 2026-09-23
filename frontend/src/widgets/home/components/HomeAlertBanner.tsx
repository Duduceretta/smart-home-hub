import { ChevronRight, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface HomeAlertBannerProps {
	activeAlertsCount: number;
}

/**
 * Banner de alertas críticos em destaque no topo da página Inicial.
 * Fixo acima do grid de dispositivos e cenas (não misturado na atividade recente).
 *
 * Renderiza condicionalmente: só aparece quando há alertas ativos reportados
 * pelo backend (`activeAlertsCount > 0`).
 */
export function HomeAlertBanner({ activeAlertsCount }: HomeAlertBannerProps) {
	const { t } = useTranslation("home");
	const navigate = useNavigate();

	if (activeAlertsCount <= 0) return null;

	const handleNavigate = () => {
		// Encaminha para o histórico de auditoria/alertas do sistema
		navigate("/history");
	};

	return (
		<aside
			role="alert"
			aria-live="polite"
			className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-alert/40 bg-alert/10 p-3.5 sm:p-4 shadow-sm transition-all hover:bg-alert/15"
		>
			<div className="flex items-center gap-3">
				<div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-alert/20 text-alert">
					<span className="relative flex h-2.5 w-2.5">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert opacity-75" />
						<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-alert" />
					</span>
					<TriangleAlert className="absolute h-4 w-4 text-alert" />
				</div>

				<div className="flex flex-col">
					<span className="text-sm font-semibold text-alert">
						{t("alerts.title", { count: activeAlertsCount })}
					</span>
					<span className="text-xs text-muted-foreground">
						Dispositivos ou rotinas necessitam de atenção imediata.
					</span>
				</div>
			</div>

			<button
				type="button"
				onClick={handleNavigate}
				className="flex items-center gap-1 rounded-md bg-alert px-3 py-1.5 text-xs font-semibold text-alert-foreground transition-colors hover:bg-alert/90 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shrink-0"
			>
				<span>{t("alerts.viewAll", "Ver detalhes")}</span>
				<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
			</button>
		</aside>
	);
}
