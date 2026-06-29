import { AnimatePresence, motion } from "framer-motion";
import type { InputHTMLAttributes, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
	id: string;
	label: string;
	icon: ReactNode;
	error?: string;
	registration: UseFormRegisterReturn;
	delayClass?: string;
}

export function FormInput({
	id,
	label,
	icon,
	error,
	registration,
	delayClass = "",
	...props
}: FormInputProps) {
	const errorAnimation = {
		initial: { opacity: 0, y: -4 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -4 },
		transition: { duration: 0.2, ease: "easeOut" as const },
	};

	return (
		<div
			className={`space-y-2 animate-fade-up opacity-0-init ${delayClass}`}
			style={{ animationFillMode: "forwards" }}
		>
			<Label
				htmlFor={id}
				className="text-xs font-medium uppercase tracking-wide text-zinc-400"
			>
				{label}
			</Label>

			<div
				className={`input-field relative rounded-lg border bg-zinc-950/50 transition-colors ${
					error ? "border-red-500/50" : "border-zinc-800"
				}`}
			>
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
					{icon}
				</div>
				<Input
					id={id}
					className="border-0 bg-transparent pl-10 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
					{...registration}
					{...props}
				/>
			</div>

			<div className="min-h-5">
				<AnimatePresence mode="wait">
					{error && (
						<motion.p {...errorAnimation} className="pl-1 text-xs text-red-400">
							{error}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
