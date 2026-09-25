import { ChevronRight, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface HomeAlertBannerProps {
	count: number;
	onDismiss: () => void;
}

/**
 * Banner de eventos de alerta/erro NOVOS em destaque no topo da página Inicial.
 * Fixo acima do grid de dispositivos e cenas (não misturado na atividade recente).
 *
 * Diferente de um contador histórico: só aparece quando chega um evento novo
 * de alerta/erro em tempo real desde que a página foi carregada (ver
 * `useHomeNewAlerts`) — alertas em si são só histórico, não têm estado de
 * "resolvido". Fechar com X só descarta o aviso da tela, sem alterar nada
 * no histórico real (`/history`).
 */
export function HomeAlertBanner({ count, onDismiss }: HomeAlertBannerProps) {
	const { t } = useTranslation("home");
	const navigate = useNavigate();

	if (count <= 0) return null;

	const handleNavigate = () => {
		// Encaminha para o histórico de auditoria/alertas do sistema
		navigate("/history");
	};

	return (
		<aside
			role="alert"
			aria-live="polite"
			className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-alert/40 bg-alert/10 p-3.5 sm:p-4 shadow-sm transition-all hover:bg-alert/15 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-safe:ease-out"
		>
			<div className="flex items-center gap-3">
				<div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-alert/20 text-alert-foreground">
					<span className="relative flex h-2.5 w-2.5">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert opacity-75" />
						<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-alert" />
					</span>
					<TriangleAlert className="absolute h-4 w-4 text-alert-foreground" />
				</div>

				<div className="flex flex-col">
					<span className="text-sm font-semibold text-alert-foreground">
						{t("alerts.title", { count })}
					</span>
					<span className="text-xs text-alert-foreground/80">
						{t(
							"alerts.description",
							"Novo evento de alerta ou erro registrado no histórico.",
						)}
					</span>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onClick={handleNavigate}
					className="flex items-center gap-1 rounded-md bg-alert/20 px-3 py-1.5 text-xs font-semibold text-alert-foreground transition-colors hover:bg-alert/30 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span>{t("alerts.viewAll", "Ver detalhes")}</span>
					<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
				</button>

				<button
					type="button"
					onClick={onDismiss}
					aria-label={t("alerts.dismiss", "Fechar")}
					className="flex h-7 w-7 items-center justify-center rounded-md text-alert-foreground/70 transition-colors hover:bg-alert/20 hover:text-alert-foreground cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>
		</aside>
	);
}
