import { ChevronDown, ChevronUp, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { cn } from "@/core/utils";
import type { DashboardAutomationSummary } from "../types/dashboard.types";

interface EditAutomationsPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	automations: DashboardAutomationSummary[];
	selectedIds: string[];
	onSave: (automationIds: string[]) => void;
	onReset: () => void;
}

const MAX_AUTOMATIONS = 3;

export function EditAutomationsPreviewModal({
	isOpen,
	onClose,
	automations,
	selectedIds,
	onSave,
	onReset,
}: EditAutomationsPreviewModalProps) {
	const { t } = useTranslation(["dashboard", "common"]);
	const [draft, setDraft] = useState<string[]>(selectedIds);

	// Sincroniza ao abrir o modal
	// biome-ignore lint/correctness/useExhaustiveDependencies: sincroniza só na transição de isOpen
	useEffect(() => {
		if (isOpen) setDraft(selectedIds);
	}, [isOpen]);

	const toggleAutomation = (id: string) => {
		if (draft.includes(id)) {
			setDraft((current) => current.filter((item) => item !== id));
		} else {
			if (draft.length >= MAX_AUTOMATIONS) return;
			setDraft((current) => [...current, id]);
		}
	};

	const moveItem = (index: number, direction: "up" | "down") => {
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= draft.length) return;
		const next = [...draft];
		const temp = next[index];
		next[index] = next[targetIndex];
		next[targetIndex] = temp;
		setDraft(next);
	};

	const handleSave = () => {
		onSave(draft);
		onClose();
	};

	const handleReset = () => {
		onReset();
		onClose();
	};

	// Lista ordenada: primeiro os selecionados na ordem do draft, depois os não selecionados
	const selectedItems = draft
		.map((id) => automations.find((a) => a.id === id))
		.filter((a): a is DashboardAutomationSummary => Boolean(a));

	const unselectedItems = automations.filter((a) => !draft.includes(a.id));
	const orderedList = [...selectedItems, ...unselectedItems];

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"border-border-subtle bg-popover text-foreground shadow-xl sm:max-w-md",
					"max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-dvh max-sm:max-w-none max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none",
				)}
			>
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
						{t("automations.editTitle", "Escolher automações exibidas")}
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						{t(
							"automations.editDescription",
							"Escolha até 3 automações para exibir no painel e ajuste a ordem desejada.",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin max-sm:max-h-none max-sm:flex-1">
					{orderedList.map((automation) => {
						const selectedIndex = draft.indexOf(automation.id);
						const isSelected = selectedIndex !== -1;
						const disabled = !isSelected && draft.length >= MAX_AUTOMATIONS;

						return (
							<div
								key={automation.id}
								className={cn(
									"flex items-center justify-between gap-3 rounded-lg border p-3 transition-all",
									disabled
										? "border-border-subtle bg-surface-low/30 opacity-40"
										: "bg-surface-container",
									isSelected
										? "border-primary/50 bg-primary/10 text-foreground"
										: !disabled &&
												"border-border-subtle hover:border-border hover:bg-surface-high",
								)}
							>
								<label className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={isSelected}
										disabled={disabled}
										onChange={() => toggleAutomation(automation.id)}
										className="h-4 w-4 shrink-0 rounded border-border-subtle text-primary accent-primary focus:ring-primary/40 cursor-pointer disabled:cursor-not-allowed"
									/>
									<span
										className={cn(
											"flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
											automation.isActive
												? "bg-primary/15 text-primary"
												: "bg-surface-high text-muted-foreground",
										)}
									>
										<Radio className="h-3.5 w-3.5" />
									</span>
									<div className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-sm font-medium text-foreground">
											{automation.name}
										</span>
										<span className="flex items-center gap-1 text-xs text-muted-foreground">
											<span
												className={cn(
													"h-1.5 w-1.5 rounded-full",
													automation.isActive
														? "bg-emerald-500"
														: "bg-muted-foreground/60",
												)}
											/>
											{automation.isActive
												? t("automations.active", "Ativa")
												: t("automations.inactive", "Desativada")}
										</span>
									</div>
								</label>

								{isSelected && (
									<div className="flex shrink-0 items-center gap-1">
										<span className="rounded bg-surface-high px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
											#{selectedIndex + 1}
										</span>
										<div className="flex flex-col gap-0.5">
											<button
												type="button"
												disabled={selectedIndex === 0}
												onClick={() => moveItem(selectedIndex, "up")}
												className="rounded p-0.5 text-muted-foreground hover:bg-surface-high hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
												aria-label="Mover para cima"
											>
												<ChevronUp className="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												disabled={selectedIndex === draft.length - 1}
												onClick={() => moveItem(selectedIndex, "down")}
												className="rounded p-0.5 text-muted-foreground hover:bg-surface-high hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
												aria-label="Mover para baixo"
											>
												<ChevronDown className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<DialogFooter className="border-t-0 bg-transparent pt-2 max-sm:rounded-b-none">
					<Button
						variant="ghost"
						onClick={handleReset}
						className="text-xs font-medium text-muted-foreground hover:bg-surface-high hover:text-foreground"
					>
						{t("roomSection.resetToAuto", "Usar automático")}
					</Button>
					<Button
						onClick={handleSave}
						className="rounded-md border border-border bg-surface-high px-4 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest cursor-pointer"
					>
						{t("common:actions.save", "Salvar")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
