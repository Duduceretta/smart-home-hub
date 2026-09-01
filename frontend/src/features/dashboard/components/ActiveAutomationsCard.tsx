import { ChevronRight, Plus, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRecentAutomations } from "../hooks/useRecentAutomations";
import { getRelativeTime } from "../lib/relativeTime";
import { DashboardErrorState } from "./DashboardErrorState";

const VISIBLE_COUNT = 3;

/**
 * Mostra as 3 automações ativas executadas mais recentemente de verdade
 * (`lastExecutedAt`, vindo de SystemEvent/AutomationExecuted no backend) —
 * cai pra `updatedAt`/`createdAt` só pras automações que nunca chegaram a
 * disparar ainda. "Ver todas as automações" leva pra tela cheia; os itens
 * da lista aqui não são clicáveis individualmente (a tela de Automações não
 * suporta seleção via URL ainda).
 *
 * O botão "Ver todas" fica ancorado no rodapé do card (`mt-auto`). Skeleton
 * só aparece no carregamento inicial (`isLoading`) — quando há menos de 3
 * automações ativas já carregadas, as vagas restantes ganham um "Empty
 * Slot" (borda tracejada, convite a criar mais uma), não um skeleton
 * fingindo que tem dado carregando.
 */
function AutomationSkeletonRow() {
	return (
		<div className="flex h-16 items-center gap-4 rounded-lg border border-border-subtle bg-surface-low/50 p-4 animate-pulse">
			<div className="h-8 w-8 shrink-0 rounded-full bg-surface-highest/60" />
			<div className="flex flex-1 flex-col gap-1.5">
				<div className="h-3.5 w-2/3 rounded-sm bg-surface-highest/60" />
				<div className="h-3 w-1/3 rounded-sm bg-surface-highest/60" />
			</div>
		</div>
	);
}

function AutomationEmptySlot({ onClick }: { onClick: () => void }) {
	const { t } = useTranslation("dashboard");

	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex h-16 items-center gap-4 rounded-lg border border-dashed border-border-subtle bg-surface-low/20 p-4 text-left transition-all hover:border-primary/40 hover:bg-surface-high cursor-pointer"
		>
			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-high text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
				<Plus className="h-4 w-4" />
			</span>
			<div className="flex flex-col">
				<span className="text-sm font-medium text-foreground/80 transition-colors group-hover:text-foreground">
					{t("automations.addSlotTitle")}
				</span>
				<span className="text-xs text-muted-foreground">
					{t("automations.addSlotSubtitle")}
				</span>
			</div>
		</button>
	);
}

export function ActiveAutomationsCard() {
	const { t, i18n } = useTranslation("dashboard");
	const navigate = useNavigate();
	const { data, isLoading, isError, refetch } = useRecentAutomations();

	const automations = data ?? [];
	const recentActive = [...automations]
		.filter((a) => a.isActive)
		.sort((a, b) => {
			const aTime = new Date(
				a.lastExecutedAt ?? a.updatedAt ?? a.createdAt,
			).getTime();
			const bTime = new Date(
				b.lastExecutedAt ?? b.updatedAt ?? b.createdAt,
			).getTime();
			return bTime - aTime;
		})
		.slice(0, VISIBLE_COUNT);
	const emptySlots =
		recentActive.length > 0 ? VISIBLE_COUNT - recentActive.length : 0;

	return (
		<div className="flex flex-1 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:border-border">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("automations.title")}
				</h3>
				<Radio className="h-4 w-4 text-muted-foreground" />
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<AutomationSkeletonRow />
					<AutomationSkeletonRow />
					<AutomationSkeletonRow />
				</div>
			) : isError ? (
				<DashboardErrorState
					title={t("automations.errorTitle")}
					subtitle={t("automations.errorSubtitle")}
					onRetry={() => refetch()}
				/>
			) : automations.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
						<Radio className="h-5 w-5" />
					</div>
					<p className="text-sm font-medium text-foreground">
						{t("automations.emptyTitle")}
					</p>
					<p className="max-w-xs text-xs text-muted-foreground">
						{t("automations.emptySubtitle")}
					</p>
					<button
						type="button"
						onClick={() =>
							navigate("/automations", {
								state: {
									returnTo: "/dashboard",
									returnLabel: t("activityLog.returnToDashboard", "Início"),
								},
							})
						}
						className="mt-2 rounded-md border border-border-subtle bg-surface-high px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-surface-highest hover:border-primary/40 cursor-pointer"
					>
						{t("automations.createCta")}
					</button>
				</div>
			) : (
				<>
					<div className="flex flex-col gap-2">
						{recentActive.length === 0 && (
							<p className="px-1 text-sm text-muted-foreground">
								{t("automations.noneActiveTitle")}
							</p>
						)}

						{recentActive.map((automation) => (
							<div
								key={automation.id}
								className="flex h-16 items-center gap-4 rounded-lg border border-border-subtle bg-surface-low/50 p-4 transition-all hover:bg-surface-high/60"
							>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
									<Radio className="h-4 w-4" />
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-foreground">
										{automation.name}
									</p>
									<p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
										<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
										{t(
											automation.lastExecutedAt
												? "automations.executedAt"
												: "automations.updatedAt",
											{
												time: getRelativeTime(
													automation.lastExecutedAt ??
														automation.updatedAt ??
														automation.createdAt,
													i18n.language || "pt-BR",
													t("activityLog.justNow", "Agora mesmo"),
												),
											},
										)}
									</p>
								</div>
							</div>
						))}

						{Array.from({ length: emptySlots }, (_, index) => (
							<AutomationEmptySlot
								// biome-ignore lint/suspicious/noArrayIndexKey: placeholders sem identidade própria
								key={`empty-slot-${index}`}
								onClick={() =>
									navigate("/automations", {
										state: {
											returnTo: "/dashboard",
											returnLabel: t("activityLog.returnToDashboard", "Início"),
										},
									})
								}
							/>
						))}
					</div>

					<button
						type="button"
						onClick={() =>
							navigate("/automations", {
								state: {
									returnTo: "/dashboard",
									returnLabel: t("activityLog.returnToDashboard", "Início"),
								},
							})
						}
						className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-high/70 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-surface-highest hover:text-foreground cursor-pointer"
					>
						{t("automations.viewAll")}
						<ChevronRight className="h-3.5 w-3.5" />
					</button>
				</>
			)}
		</div>
	);
}
