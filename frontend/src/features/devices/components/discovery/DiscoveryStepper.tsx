import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DiscoveryStep } from "../../store/devices-ui.store";

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
					<li key={step.key} className="flex gap-3">
						<div className="flex flex-col items-center">
							<span
								className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ease-out ${
									isActive
										? "scale-110 bg-linear-to-b from-[#3a393a] to-[#2f2e2f] text-[#e5e2e2] ring-1 ring-[#c5c6cf]/50 shadow-[0_0_6px_rgba(197,198,207,0.15)]"
										: isCompleted
											? "bg-[#c5c6cf]/20 text-[#c5c6cf]"
											: "bg-[#2a2a2a] text-[#c7c6cb]"
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
									className={`w-px flex-1 transition-colors duration-300 ${isCompleted ? "bg-[#c5c6cf]/40" : "bg-[#46464b]/30"}`}
								/>
							)}
						</div>
						<div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
							<p
								className={`text-sm font-medium transition-colors duration-300 ${
									isActive ? "text-[#e5e2e2]" : "text-[#c7c6cb]"
								}`}
							>
								{t(step.titleKey)}
							</p>
							<p className="mt-0.5 text-[11px] text-[#8a898f]">
								{t(step.descriptionKey)}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
};
