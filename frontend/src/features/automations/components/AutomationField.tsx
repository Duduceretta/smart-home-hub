import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Label } from "@/core/components/ui/label";
import { cn } from "@/core/utils";

interface AutomationFieldProps {
	id: string;
	label: string;
	error?: string;
	children: ReactNode;
	className?: string;
}

const errorAnimation = {
	initial: { opacity: 0, y: -2 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -2 },
	transition: { duration: 0.15, ease: "easeOut" as const },
};

/**
 * Wrapper local de label+erro pra campos do formulário de automação, na
 * paleta do dashboard — equivalente ao core/components/forms/FormInput.tsx,
 * mas sem o zinc/indigo hardcoded (esse não tem prop de customização).
 */
export function AutomationField({
	id,
	label,
	error,
	children,
	className,
}: AutomationFieldProps) {
	const errorId = `${id}-error`;

	return (
		<div className={cn("space-y-1.5 w-full min-w-0", className)}>
			<Label
				htmlFor={id}
				className={cn(
					"block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
					error && "text-alert-foreground",
				)}
			>
				{label}
			</Label>

			{children}

			<div className="min-h-4.5 flex items-start pt-0.5">
				<AnimatePresence mode="wait">
					{error && (
						<motion.p
							id={errorId}
							{...errorAnimation}
							className="pl-1 text-[11px] font-medium text-alert-foreground leading-tight"
						>
							{error}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
