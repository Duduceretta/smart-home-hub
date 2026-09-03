import { ChevronRight, Pencil, Plus, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { useRecentAutomations } from "../hooks/useRecentAutomations";
import { useToggleDashboardAutomation } from "../hooks/useToggleDashboardAutomation";
import { getRelativeTime } from "../lib/relativeTime";
import { useDashboardPreviewStore } from "../store/dashboard-preview.store";
import type { DashboardAutomationSummary } from "../types/dashboard.types";
import { DashboardErrorState } from "./DashboardErrorState";
import { EditAutomationsPreviewModal } from "./EditAutomationsPreviewModal";

const VISIBLE_COUNT = 3;

/**
 * Mostra até 3 automações no painel da dashboard.
 * A ordem e seleção podem ser customizadas pelo usuário através do botão de edição (Pencil),
 * espelhando o comportamento das seções de cômodos (RoomDeviceSection).
 * As automações não mudam de lugar automaticamente ao serem ativadas/desativadas.
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
	const toggleAutomation = useToggleDashboardAutomation();
	const [isEditOpen, setIsEditOpen] = useState(false);

	const automationOverrides = useDashboardPreviewStore(
		(s) => s.automationOverrides,
	);
	const setAutomationPreview = useDashboardPreviewStore(
		(s) => s.setAutomationPreview,
	);
	const clearAutomationPreview = useDashboardPreviewStore(
		(s) => s.clearAutomationPreview,
	);

	const automations = data ?? [];

	// Se o usuário customizou a exibição, usa os IDs escolhidos na ordem exata definida por ele
	const displayedAutomations = useMemo(() => {
		if (automations.length === 0) return [];

		if (automationOverrides && automationOverrides.length > 0) {
			const overridden = automationOverrides
				.map((id) => automations.find((a) => a.id === id))
				.filter((a): a is DashboardAutomationSummary => Boolean(a));
			if (overridden.length > 0) {
				return overridden.slice(0, VISIBLE_COUNT);
			}
		}

		// Ordem padrão estável: por data de criação (nunca reordena ao ativar/desativar)
		return [...automations]
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)
			.slice(0, VISIBLE_COUNT);
	}, [automations, automationOverrides]);

	const emptySlots =
		displayedAutomations.length > 0
			? VISIBLE_COUNT - displayedAutomations.length
			: 0;

	return (
		<div className="flex flex-1 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:border-border">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("automations.title")}
					</h3>
					{automations.length > 0 && (
						<button
							type="button"
							onClick={() => setIsEditOpen(true)}
							aria-label={t(
								"automations.editTitle",
								"Escolher automações exibidas",
							)}
							className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer"
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
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
									openCreate: true,
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
						{displayedAutomations.map((automation) => (
							// biome-ignore lint/a11y/useSemanticElements: precisa envolver o Switch (um <button> real do Radix) — button-dentro-de-button é inválido, então a linha inteira vira role="button" e o toggle para propagação
							<div
								key={automation.id}
								role="button"
								tabIndex={0}
								onClick={() =>
									navigate(`/automations?automation=${automation.id}`, {
										state: {
											returnTo: "/dashboard",
											returnLabel: t("activityLog.returnToDashboard", "Início"),
											selectedAutomationId: automation.id,
										},
									})
								}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										navigate(`/automations?automation=${automation.id}`, {
											state: {
												returnTo: "/dashboard",
												returnLabel: t(
													"activityLog.returnToDashboard",
													"Início",
												),
												selectedAutomationId: automation.id,
											},
										});
									}
								}}
								className={cn(
									"group flex h-16 items-center gap-4 rounded-lg border border-border-subtle bg-surface-low/50 p-4 transition-all duration-200 hover:bg-surface-high/60 hover:border-border cursor-pointer",
									!automation.isActive && "opacity-80",
								)}
							>
								<span
									className={cn(
										"flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
										automation.isActive
											? "bg-primary/15 text-primary group-hover:bg-primary/25"
											: "bg-surface-high text-muted-foreground",
									)}
								>
									<Radio className="h-4 w-4" />
								</span>
								<div className="min-w-0 flex-1">
									<p
										className={cn(
											"truncate text-sm font-medium transition-colors group-hover:text-primary",
											automation.isActive
												? "text-foreground"
												: "text-foreground/80",
										)}
									>
										{automation.name}
									</p>
									<p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
										<span
											className={cn(
												"h-1.5 w-1.5 shrink-0 rounded-full",
												automation.isActive
													? "bg-emerald-500"
													: "bg-muted-foreground/60",
											)}
										/>
										{automation.isActive
											? t(
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
												)
											: t("automations.inactive", "Desativada")}
									</p>
								</div>
								{/** biome-ignore lint/a11y/noStaticElementInteractions: só existe pra isolar o clique do Switch da navegação da linha (stopPropagation) */}
								<div
									className="flex shrink-0 items-center"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									<Switch
										checked={automation.isActive}
										disabled={toggleAutomation.isPending}
										onCheckedChange={(checked) =>
											toggleAutomation.mutate({
												id: automation.id,
												name: automation.name,
												rulePayload: automation.rulePayload ?? "{}",
												isActive: checked,
											})
										}
										aria-label={`${automation.isActive ? "Desativar" : "Ativar"} automação ${automation.name}`}
										className="scale-85"
									/>
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
											openCreate: true,
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

			{isEditOpen && (
				<EditAutomationsPreviewModal
					isOpen={isEditOpen}
					onClose={() => setIsEditOpen(false)}
					automations={automations}
					selectedIds={displayedAutomations.map((a) => a.id)}
					onSave={(ids) => setAutomationPreview(ids)}
					onReset={() => clearAutomationPreview()}
				/>
			)}
		</div>
	);
}
