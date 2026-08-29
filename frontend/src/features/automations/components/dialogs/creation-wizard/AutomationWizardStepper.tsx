import { Check } from "lucide-react";
import { cn } from "@/core/utils";
import type { WizardStepNumber } from "../../../types/automation-wizard.types";

const SEGMENTS: {
	label: string;
	description: string;
	steps: WizardStepNumber[];
}[] = [
	{ label: "Gatilho", description: "Quando disparar", steps: [1, 2] },
	{ label: "Ações", description: "O que acontece", steps: [3] },
	{ label: "Revisão", description: "Confirme e salve", steps: [4] },
];

interface AutomationWizardStepperProps {
	currentStep: WizardStepNumber;
}

/**
 * Mesma estrutura vertical do DiscoveryStepper (número/check + linha
 * conectando + label/descrição), mas com os tokens do design system em vez
 * das cores hex fixas do wizard de dispositivos. 3 segmentos visuais pra 4
 * passos internos: "Gatilho" cobre os passos 1 (origem) e 2 (configuração),
 * já que pro usuário são a mesma etapa conceitual.
 */
export function AutomationWizardStepper({
	currentStep,
}: AutomationWizardStepperProps) {
	return (
		<ol className="flex flex-col gap-1">
			{SEGMENTS.map((segment, index) => {
				const maxStep = Math.max(...segment.steps);
				const isActive = segment.steps.includes(currentStep);
				const isCompleted = currentStep > maxStep;
				const isLast = index === SEGMENTS.length - 1;

				return (
					<li key={segment.label} className="flex gap-4">
						<div className="flex flex-col items-center">
							<span
								className={cn(
									"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ease-out",
									isActive
										? "scale-110 bg-primary/15 text-primary ring-1 ring-primary/50"
										: isCompleted
											? "bg-primary/10 text-primary"
											: "bg-surface-high text-muted-foreground",
								)}
							>
								{isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
							</span>
							{!isLast && (
								<div
									className={cn(
										"w-px flex-1 transition-colors duration-300",
										isCompleted ? "bg-primary/40" : "bg-border-subtle/30",
									)}
								/>
							)}
						</div>
						<div className={cn("pb-6", isLast && "pb-0")}>
							<p
								className={cn(
									"text-sm font-medium transition-colors duration-300",
									isActive ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{segment.label}
							</p>
							<p className="mt-0.5 text-sm text-muted-foreground">
								{segment.description}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
