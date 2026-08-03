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
					"block text-xs font-medium uppercase tracking-wide text-zinc-400 transition-colors truncate",
					error && "text-red-400",
				)}
			>
				{label}
			</Label>

			<div
				className={cn(
					"input-field relative rounded-lg border bg-zinc-950/50 transition-all",
					error
						? "border-red-500/50 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
						: "border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50",
				)}
			>
				<div
					className={cn(
						"pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 transition-colors",
						error ? "text-red-400/50" : "text-zinc-600",
					)}
				>
					{icon}
				</div>
				<Input
					id={id}
					className="border-0 bg-transparent pl-10 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
					aria-invalid={!!error}
					aria-describedby={error ? errorId : undefined}
					{...registration}
					{...props}
					onKeyDown={handleKeyDown}
					onChange={handleChange}
				/>
			</div>

			<div className="min-h-4.5 flex items-start pt-0.5">
				<AnimatePresence mode="wait">
					{error && (
						<motion.p
							id={errorId}
							{...errorAnimation}
							className="pl-1 text-[11px] font-medium text-red-400 truncate w-full leading-tight"
						>
							{error}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
