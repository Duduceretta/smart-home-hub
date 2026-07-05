import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import {
	type Control,
	Controller,
	type FieldValues,
	type Path,
} from "react-hook-form";
import { cn } from "@/core/utils";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

interface FormSelectProps<T extends FieldValues> {
	id: string;
	name: Path<T>;
	control: Control<T>;
	label: string;
	icon: ReactNode;
	placeholder?: string;
	error?: string;
	options: Array<{ value: string | number; label: string }>;
	delayClass?: string;
	className?: string;
}

export function FormSelect<T extends FieldValues>({
	id,
	name,
	control,
	label,
	icon,
	placeholder = "Selecione...",
	error,
	options,
	delayClass,
	className,
}: FormSelectProps<T>) {
	const errorAnimation = {
		initial: { opacity: 0, y: -4 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -4 },
		transition: { duration: 0.2, ease: "easeOut" as const },
	};

	const errorId = `${id}-error`;

	return (
		<div
			className={cn(
				"space-y-1.5 animate-fade-up opacity-0-init w-full min-w-0",
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

			<Controller
				control={control}
				name={name}
				render={({ field }) => {
					// 🛡️ Blindagem de Estado Vazio: Se for 0, nulo ou vazio, tratamos como "" para mostrar o placeholder!
					const currentValue =
						field.value !== undefined &&
						field.value !== null &&
						field.value !== 0
							? field.value.toString()
							: "";

					return (
						<Select
							value={currentValue}
							onValueChange={(val) => {
								const numericVal = Number(val);
								field.onChange(
									!Number.isNaN(numericVal) && val.trim() !== ""
										? numericVal
										: val,
								);
							}}
						>
							<div
								className={cn(
									"relative w-full rounded-lg border bg-zinc-950/50 transition-all",
									error
										? "border-red-500/50 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
										: "border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50",
								)}
							>
								{/* Ícone alinhado vertical e horizontalmente no lado esquerdo */}
								<div
									className={cn(
										"pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 transition-colors",
										error ? "text-red-400/50" : "text-zinc-500",
									)}
								>
									{icon}
								</div>

								{/* Trigger com pl-10 (para o ícone) e pr-8 (para a setinha), além de truncate */}
								<SelectTrigger
									id={id}
									aria-invalid={!!error}
									aria-describedby={error ? errorId : undefined}
									className="w-full border-0 bg-transparent py-2.5 pl-10 pr-8 text-sm text-zinc-100 shadow-none focus:ring-0 focus:ring-offset-0 data-placeholder:text-zinc-600 truncate text-left"
								>
									<SelectValue placeholder={placeholder} />
								</SelectTrigger>
							</div>

							<SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl z-99999">
								{options.map((opt) => (
									<SelectItem
										key={opt.value}
										value={opt.value.toString()}
										className="cursor-pointer text-xs focus:bg-zinc-800 focus:text-indigo-300 truncate"
									>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					);
				}}
			/>

			{/* 🛡️ Altura fixa (h-5) garante que o erro apareça SEM empurrar o formulário para baixo */}
			<div className="h-5 flex items-center">
				<AnimatePresence mode="wait">
					{error && (
						<motion.p
							id={errorId}
							{...errorAnimation}
							className="pl-1 text-xs text-red-400 truncate w-full"
						>
							{error}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
