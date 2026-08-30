import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DiscoveryStep } from "../../../store/devices-ui.store";
import { cn } from "@/core/utils";

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
                    <li key={step.key} className="flex gap-3.5">
                        <div className="flex flex-col items-center">
                            <span
                                className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs transition-all duration-300 ease-out",
                                    isActive &&
                                        "scale-105 border border-primary/40 bg-primary/20 font-bold text-primary ring-2 ring-primary/25 shadow-xs",
                                    isCompleted &&
                                        "border border-primary/30 bg-primary/15 font-semibold text-primary",
                                    !isActive &&
                                        !isCompleted &&
                                        "border border-border-subtle bg-surface-high font-medium text-muted-foreground",
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-3.5 w-3.5 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300" />
                                ) : (
                                    step.order
                                )}
                            </span>

                            {!isLast && (
                                <div
                                    className={cn(
                                        "w-px flex-1 my-1 transition-colors duration-300",
                                        isCompleted ? "bg-primary/40" : "bg-border-subtle",
                                    )}
                                />
                            )}
                        </div>

                        <div className={cn("pb-6", isLast && "pb-0")}>
                            <p
                                className={cn(
                                    "text-sm font-semibold tracking-tight transition-colors duration-300",
                                    isActive ? "text-foreground" : "text-muted-foreground",
                                )}
                            >
                                {t(step.titleKey)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground/70">
                                {t(step.descriptionKey)}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};
