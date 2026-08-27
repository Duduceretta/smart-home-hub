import { Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { TRIGGER_SOURCE_OPTIONS } from "../../constants/automations.constants";
import { useAutomationWizard } from "../../hooks/useAutomationWizard";
import { useCreateAutomation } from "../../hooks/useCreateAutomation";
import { usePickerDevices } from "../../hooks/usePickerDevices";
import { mapWizardStateToCreatePayload } from "../../lib/automation-wizard-payload.mapper";
import { useAutomationsUIStore } from "../../store/automations-ui.store";
import { ActionsStep } from "../automation-form/ActionsStep";
import { TriggerConfigStep } from "../automation-form/TriggerConfigStep";
import { AutomationWizardStepper } from "./AutomationWizardStepper";
import { ReviewStep } from "./ReviewStep";
import { TriggerSourceStep } from "./TriggerSourceStep";

/**
 * Contêiner do wizard de criação — mesma estrutura de duas colunas do
 * DeviceDiscoveryModal (sidebar com stepper à esquerda, conteúdo do passo
 * atual à direita, dentro de um único Dialog), só que com os tokens reais
 * do design system em vez das cores hex fixas daquele wizard mais antigo.
 */
export function AutomationCreationWizard() {
	const isOpen = useAutomationsUIStore((s) => s.isCreateWizardOpen);
	const closeCreateWizard = useAutomationsUIStore((s) => s.closeCreateWizard);

	const wizard = useAutomationWizard();
	const { state, isTriggerConfigValid, isActionsStepValid, hasProgress } =
		wizard;

	const { data: devices = [], isLoading: isLoadingDevices } =
		usePickerDevices();
	const createAutomation = useCreateAutomation();

	const contentRef = useRef<HTMLDivElement>(null);

	// Foco move pro primeiro campo/opção do passo a cada troca — acessibilidade
	// pedida explicitamente (avançar/voltar não deixa o foco "preso" no botão
	// que disparou a troca).
	useEffect(() => {
		if (!isOpen) return;
		const firstField = contentRef.current?.querySelector<HTMLElement>(
			'input, [role="combobox"], button:not([disabled])',
		);
		firstField?.focus();
	}, [isOpen]);

	const handleClose = () => {
		if (hasProgress) {
			const confirmed = confirm(
				"Descartar essa automação? O progresso preenchido será perdido.",
			);
			if (!confirmed) return;
		}
		closeCreateWizard();
		wizard.reset();
	};

	const handleSubmit = () => {
		const payload = mapWizardStateToCreatePayload(state);
		createAutomation.mutate(payload, {
			onSuccess: () => {
				closeCreateWizard();
				wizard.reset();
			},
		});
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl">
				<div className="flex max-h-[80vh] min-h-[520px]">
					{/* Coluna esquerda: contexto + stepper */}
					<div className="flex w-[32%] shrink-0 flex-col justify-between border-r border-border-subtle/20 bg-surface-low p-6">
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-4">
								<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
									<Zap className="h-5 w-5" />
								</span>
								<DialogHeader className="gap-1">
									<DialogTitle className="text-lg">Nova Automação</DialogTitle>
									<DialogDescription className="text-xs">
										Configure um gatilho e as ações que ele dispara.
									</DialogDescription>
								</DialogHeader>
							</div>

							<AutomationWizardStepper currentStep={state.step} />
						</div>
					</div>

					{/* Coluna direita: conteúdo do passo atual */}
					<div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
						<div className="flex flex-1 flex-col overflow-y-auto p-6">
							<div
								ref={contentRef}
								key={state.step}
								className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-300 motion-safe:ease-out"
							>
								{state.step === 1 && (
									<>
										<TriggerSourceStep
											selected={state.triggerSource}
											onSelect={wizard.selectTriggerSource}
										/>
										<div className="mt-4 flex items-center justify-end border-t border-border-subtle/20 pt-4">
											<Button
												type="button"
												disabled={
													!state.triggerSource ||
													TRIGGER_SOURCE_OPTIONS.find(
														(o) => o.value === state.triggerSource,
													)?.comingSoon
												}
												onClick={() => wizard.goToStep(2)}
											>
												Próximo
											</Button>
										</div>
									</>
								)}

								{state.step === 2 && (
									<>
										<TriggerConfigStep
											form={wizard}
											devices={devices}
											isLoadingDevices={isLoadingDevices}
										/>
										<div className="mt-4 flex items-center justify-between border-t border-border-subtle/20 pt-4">
											<Button
												type="button"
												variant="outline"
												onClick={() => wizard.goToStep(1)}
											>
												Voltar
											</Button>
											<Button
												type="button"
												disabled={!isTriggerConfigValid}
												onClick={() => wizard.goToStep(3)}
											>
												Próximo
											</Button>
										</div>
									</>
								)}

								{state.step === 3 && (
									<>
										<ActionsStep
											form={wizard}
											devices={devices}
											isLoadingDevices={isLoadingDevices}
										/>
										<div className="mt-4 flex items-center justify-between border-t border-border-subtle/20 pt-4">
											<Button
												type="button"
												variant="outline"
												onClick={() => wizard.goToStep(2)}
											>
												Voltar
											</Button>
											<Button
												type="button"
												disabled={!isActionsStepValid}
												onClick={() => wizard.goToStep(4)}
											>
												Próximo
											</Button>
										</div>
									</>
								)}

								{state.step === 4 && (
									<ReviewStep
										wizard={wizard}
										devices={devices}
										onSubmit={handleSubmit}
										isSubmitting={createAutomation.isPending}
										submitError={createAutomation.error?.message}
									/>
								)}
							</div>
						</div>
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent" />
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
