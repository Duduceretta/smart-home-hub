import { AnimatePresence, motion } from "framer-motion";
import type { InputHTMLAttributes, ReactNode } from "react";
import React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/core/utils";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
	id: string;
	label: string;
	icon: ReactNode;
	error?: string;
	registration: UseFormRegisterReturn;
	mask?: (value: string, isDeleting?: boolean) => string;
	delayClass?: string;
}

export function FormInput({
	id,
	label,
	icon,
	error,
	registration,
	mask,
	delayClass,
	className,
	...props
}: FormInputProps) {
	const isDeletingRef = React.useRef(false);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		isDeletingRef.current = e.key === "Backspace" || e.key === "Delete";
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (mask) {
			const formattedValue = mask(e.target.value, isDeletingRef.current);
			e.target.value = formattedValue;
		}

		isDeletingRef.current = false;
		registration.onChange(e);
	};

	const errorAnimation = {
		initial: { opacity: 0, y: -2 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -2 },
		transition: { duration: 0.15, ease: "easeOut" as const },
	};

	const errorId = `${id}-error`;

	return (
		<div
			className={cn(
				"space-y-1 animate-fade-up opacity-0-init w-full min-w-0",
				delayClass,
				className,
			)}
			style={{ animationFillMode: "forwards" }}
		>
			<Label
				htmlFor={id}
				className={cn(
					"block text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors truncate",
					error && "text-destructive",
				)}
			>
				{label}
			</Label>

			<div
				className={cn(
					"input-field relative rounded-lg border bg-surface-container/60 transition-all",
					error
						? "border-destructive/50 focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive/30"
						: "border-border-subtle focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
				)}
			>
				<div
					className={cn(
						"pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 transition-colors",
						error ? "text-destructive/70" : "text-muted-foreground",
					)}
				>
					{icon}
				</div>
				<Input
					id={id}
					className="h-11 sm:h-10 border-0 bg-transparent pl-10 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
					aria-invalid={!!error}
					aria-describedby={error ? errorId : undefined}
					{...registration}
					{...props}
					onKeyDown={handleKeyDown}
					onChange={handleChange}
				/>
			</div>

			<div className="min-h-5 flex items-start pt-0.5">
				<AnimatePresence mode="wait">
					{error && (
						<motion.p
							id={errorId}
							{...errorAnimation}
							className="pl-1 text-xs font-medium text-destructive truncate w-full leading-tight"
						>
							{error}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
