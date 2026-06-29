import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";
import { type InputHTMLAttributes, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
	id: string;
	label: string;
	labelRight?: React.ReactNode;
	error?: string;
	registration: UseFormRegisterReturn;
	delayClass?: string;
}

export function PasswordInput({
	id,
	label,
	labelRight,
	error,
	registration,
	delayClass = "",
	...props
}: PasswordInputProps) {
	const [showPassword, setShowPassword] = useState(false);

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
			<div className="flex items-center justify-between">
				<Label
					htmlFor={id}
					className="text-xs font-medium uppercase tracking-wide text-zinc-400"
				>
					{label}
				</Label>
				{labelRight && <div>{labelRight}</div>}
			</div>

			<div
				className={`input-field relative rounded-lg border bg-zinc-950/50 transition-colors ${
					error ? "border-red-500/50" : "border-zinc-800"
				}`}
			>
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
					<Lock className="h-4 w-4" />
				</div>
				<Input
					id={id}
					type={showPassword ? "text" : "password"}
					className="border-0 bg-transparent pl-10 pr-10 text-zinc-50 focus-visible:ring-0 focus-visible:ring-offset-0"
					{...registration}
					{...props}
				/>
				<button
					type="button"
					onClick={() => setShowPassword(!showPassword)}
					className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-600 transition-colors hover:text-zinc-400 focus:outline-none"
					tabIndex={-1}
					aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
				>
					{showPassword ? (
						<EyeOff className="h-4 w-4" />
					) : (
						<Eye className="h-4 w-4" />
					)}
				</button>
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
