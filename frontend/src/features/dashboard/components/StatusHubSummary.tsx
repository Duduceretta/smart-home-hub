import {
	ShieldAlert,
	Thermometer,
	TriangleAlert,
	Wifi,
	Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { StaleDataIndicator } from "@/core/components/feedback/StaleDataIndicator";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { formatEnergy } from "../lib/formatEnergy";

interface StatusHubSummaryProps {
	/** true durante falha sistêmica (2+ queries do Dashboard falhando ao
	 * mesmo tempo) — suprime o fallback local em favor do banner
	 * consolidado no topo, mantendo só o skeleton estático na mesma
	 * dimensão do grid de 4 KPIs. */
	suppressErrorUI?: boolean;
}

const METRIC_KEYS = ["energy", "devices", "temperature", "alerts"];

function StatusHubSummarySkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
			{METRIC_KEYS.map((metricKey) => (
				<div
					key={`skeleton-${metricKey}`}
					className="flex h-24 flex-col justify-between rounded-xl border border-border-subtle bg-surface-container p-4"
				>
					<div className="h-3 w-20 rounded-md bg-surface-high" />
					<div className="h-6 w-16 rounded-md bg-surface-high" />
				</div>
			))}
		</div>
	);
}

interface StatusHubSummaryErrorGridProps {
	message: string;
	retryLabel: string;
	onRetry: () => void;
}

/**
 * Erro local (só a query desta seção falhou, as outras 4 do Dashboard
 * seguem OK) — preserva o grid de 4 células do skeleton/estado carregado
 * em vez de colapsar pra uma caixa única centralizada. Cada célula é
 * minimalista (ícone + retry) porque repetir a frase completa 4x seria
 * ruído; a mensagem completa fica em `aria-label` no próprio `role="alert"`
 * de cada célula, pra leitor de tela anunciar o contexto real.
 */
function StatusHubSummaryErrorGrid({
	message,
	retryLabel,
	onRetry,
}: StatusHubSummaryErrorGridProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{METRIC_KEYS.map((metricKey) => (
				<div
					key={`error-${metricKey}`}
					role="alert"
					aria-label={message}
					className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-surface-low/50 p-4 text-center"
				>
					<TriangleAlert
						className="h-4 w-4 text-muted-foreground"
						aria-hidden="true"
					/>
					<button
						type="button"
						onClick={onRetry}
						className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline cursor-pointer"
					>
						{retryLabel}
					</button>
				</div>
			))}
		</div>
	);
}

export function StatusHubSummary({
	suppressErrorUI = false,
}: StatusHubSummaryProps) {
	const { t } = useTranslation("dashboard");
	const { data, isLoading, isError, refetch } = useDashboardOverview();

	if (isLoading) {
		return <StatusHubSummarySkeleton />;
	}

	if (!data) {
		if (isError) {
			if (suppressErrorUI) {
				return <StatusHubSummarySkeleton />;
			}
			return (
				<StatusHubSummaryErrorGrid
					message={t(
						"metrics.errorTitle",
						"Não foi possível carregar os indicadores",
					)}
					retryLabel={t("common:actions.retry", "Tentar novamente")}
					onRetry={() => refetch()}
				/>
			);
		}
		return null;
	}

	// Stale-while-revalidate: um refetch em background pode ter falhado
	// (`isError`), mas já existe `data` de um fetch anterior bem-sucedido —
	// mantém o conteúdo normal na tela em vez do fallback de erro, só com um
	// indicador discreto (seção 12.1 de ui-and-design-system.md).

	const { summary } = data;
	const energy = formatEnergy(summary.energyConsumptionKwh);

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/* Card 1: Consumo Acumulado */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.energyConsumption")}
					</span>
					{isError && <StaleDataIndicator className="mr-1" />}
					<Zap className="h-4 w-4 shrink-0 text-amber-400" />
				</div>
				<div className="flex flex-col gap-0.5">
					<div>
						<span
							className="text-2xl font-semibold tracking-tight text-foreground"
							title={
								summary.isEnergyEstimated
									? t(
											"metrics.energyEstimatedTitle",
											"Inclui consumo estimado de dispositivos sem sensor de energia (ex: TV)",
										)
									: undefined
							}
						>
							{summary.isEnergyEstimated && "~"}
							{energy.value}
						</span>
						<span className="ml-1 text-xs font-medium text-muted-foreground">
							{energy.unit}
						</span>
					</div>
					<span className="truncate text-xs text-muted-foreground">
						{t("metrics.energyConsumptionSubtitle", "Acumulado hoje")}
						{summary.isEnergyEstimated &&
							` · ${t("metrics.energyEstimatedShort", "inclui estimativa")}`}
					</span>
				</div>
			</div>

			{/* Card 2: Dispositivos Online */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.onlineDevices")}
					</span>
					<Wifi className="h-4 w-4 shrink-0 text-primary" />
				</div>
				<div className="flex flex-col gap-2.5">
					<div>
						<span className="text-2xl font-semibold tracking-tight text-foreground">
							{summary.onlineDevicesCount}
						</span>
						<span className="ml-1 text-xs font-medium text-muted-foreground">
							{t("metrics.activeOf", { total: summary.totalDevicesCount })}
						</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-low">
						<div
							className="h-full rounded-full bg-primary transition-all duration-500"
							style={{
								width: `${summary.totalDevicesCount > 0 ? (summary.onlineDevicesCount / summary.totalDevicesCount) * 100 : 0}%`,
							}}
						/>
					</div>
				</div>
			</div>

			{/* Card 3: Temperatura Média */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.averageTemperature")}
					</span>
					<Thermometer className="h-4 w-4 shrink-0 text-sky-400" />
				</div>
				<div className="flex items-baseline gap-2">
					<span className="text-2xl font-semibold tracking-tight text-foreground">
						{Math.round(summary.averageTemperatureCelsius)}°C
					</span>
					<span className="rounded-md border border-border-subtle bg-surface-low px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
						{summary.temperatureTrend > 0 ? "+" : ""}
						{summary.temperatureTrend}°C
					</span>
				</div>
			</div>

			{/* Card 4: Alertas de Segurança */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.securityAlerts")}
					</span>
					<ShieldAlert
						className={`h-4 w-4 shrink-0 ${
							summary.activeAlertsCount > 0
								? "text-destructive"
								: "text-muted-foreground"
						}`}
					/>
				</div>
				<div>
					<span
						className={`text-2xl font-semibold tracking-tight ${
							summary.activeAlertsCount > 0
								? "text-destructive"
								: "text-foreground"
						}`}
					>
						{summary.activeAlertsCount}
					</span>
					<span className="ml-1 text-xs font-medium text-muted-foreground">
						{t("metrics.alertsUnit")}
					</span>
				</div>
			</div>
		</div>
	);
}
