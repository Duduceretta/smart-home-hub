import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DiscoveryStep } from "../../../store/devices-ui.store";

const STEPS: {
	key: DiscoveryStep;
	order: number;
	titleKey:
		| "discoveryModal.stepper.step1"
		| "discoveryModal.stepper.step2"
		| "discoveryModal.stepper.step3";
	descriptionKey:
		| "discoveryModal.stepper.step1Description"
		| "discoveryModal.stepper.step2Description"
		| "discoveryModal.stepper.step3Description";
}[] = [
	{
		key: "scan",
		order: 1,
		titleKey: "discoveryModal.stepper.step1",
		descriptionKey: "discoveryModal.stepper.step1Description",
	},
	{
		key: "configure",
		order: 2,
		titleKey: "discoveryModal.stepper.step2",
		descriptionKey: "discoveryModal.stepper.step2Description",
	},
	{
		key: "done",
		order: 3,
		titleKey: "discoveryModal.stepper.step3",
		descriptionKey: "discoveryModal.stepper.step3Description",
	},
];

interface DiscoveryStepperProps {
	currentStep: DiscoveryStep;
}

export const DiscoveryStepper: React.FC<DiscoveryStepperProps> = ({
	currentStep,
}) => {
	const { t } = useTranslation("devices");
	const currentOrder =
		STEPS.find((step) => step.key === currentStep)?.order ?? 1;

	return (
		<ol className="flex flex-col gap-1">
			{STEPS.map((step, index) => {
				const isCompleted = step.order < currentOrder;
				const isActive = step.key === currentStep;
				const isLast = index === STEPS.length - 1;

				return (
					<li key={step.key} className="flex gap-4">
						<div className="flex flex-col items-center">
							<span
								className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ease-out ${
									isActive
										? "scale-110 bg-surface-highest text-foreground ring-1 ring-primary/50 shadow-[0_0_6px_rgba(197,198,207,0.15)]"
										: isCompleted
											? "bg-primary/20 text-primary"
											: "bg-surface-high text-muted-foreground"
								}`}
							>
								{isCompleted ? (
									<Check className="h-3.5 w-3.5 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300" />
								) : (
									step.order
								)}
							</span>
							{!isLast && (
								<div
									className={`w-px flex-1 transition-colors duration-300 ${isCompleted ? "bg-primary/40" : "bg-border-subtle/30"}`}
								/>
							)}
						</div>
						<div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
							<p
								className={`text-sm font-medium transition-colors duration-300 ${
									isActive ? "text-foreground" : "text-muted-foreground"
								}`}
							>
								{t(step.titleKey)}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground/60">
								{t(step.descriptionKey)}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
};
