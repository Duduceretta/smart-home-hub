import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Fingerprint, Key, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

export function LoginForm() {
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
		showPassword,
		setShowPassword,
	} = useLoginForm();

	const errorAnimation = {
		initial: { opacity: 0, y: -4 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -4 },
		transition: { duration: 0.2, ease: "easeOut" as const },
	};

	return (
		<div
			className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-8">
				<h2 className="mb-1 text-3xl font-semibold text-zinc-50">
					Bem-vindo(a)
				</h2>
				<p className="text-sm text-zinc-400">
					Insira suas credenciais para acessar o ecossistema.
				</p>
			</div>

			<form onSubmit={handleFormSubmit} noValidate className="space-y-2.5">
				{/* --- Campo de Email --- */}
				<div
					className="space-y-2 animate-fade-up delay-200 opacity-0-init"
					style={{ animationFillMode: "forwards" }}
				>
					<Label
						htmlFor="email"
						className="text-xs font-medium uppercase tracking-wide text-zinc-400"
					>
						Email
					</Label>
					<div
						className={`input-field relative rounded-lg border bg-zinc-950/50 transition-colors ${errors.email ? "border-red-500/50" : "border-zinc-800"}`}
					>
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
							<Mail className="h-4 w-4" />
						</div>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="admin@smart.local"
							className="border-0 bg-transparent pl-10 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
							{...register("email")}
						/>
					</div>

					<div className="min-h-5">
						<AnimatePresence mode="wait">
							{errors.email && (
								<motion.p
									{...errorAnimation}
									className="pl-1 text-xs text-red-400"
								>
									{errors.email.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				</div>

				{/* --- Campo de Senha com Olhinho --- */}
				<div
					className="space-y-2 animate-fade-up delay-300 opacity-0-init"
					style={{ animationFillMode: "forwards" }}
				>
					<div className="flex items-center justify-between">
						<Label
							htmlFor="password"
							className="text-xs font-medium uppercase tracking-wide text-zinc-400"
						>
							Senha
						</Label>
						<a
							href="/recuperar-senha"
							className="text-xs text-indigo-400 transition-colors hover:text-indigo-300"
						>
							Esqueceu a senha?
						</a>
					</div>

					<div
						className={`input-field relative rounded-lg border bg-zinc-950/50 transition-colors ${errors.password ? "border-red-500/50" : "border-zinc-800"}`}
					>
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
							<Lock className="h-4 w-4" />
						</div>
						<Input
							id="password"
							type={showPassword ? "text" : "password"}
							autoComplete="current-password"
							placeholder="••••••••"
							className="border-0 bg-transparent pl-10 pr-10 text-zinc-50 focus-visible:ring-0 focus-visible:ring-offset-0"
							{...register("password")}
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
							{errors.password && (
								<motion.p
									{...errorAnimation}
									className="pl-1 text-xs text-red-400"
								>
									{errors.password.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				</div>

				{/* --- Botão Principal --- */}
				<div
					className="pt-2 animate-fade-up delay-400 opacity-0-init"
					style={{ animationFillMode: "forwards" }}
				>
					<Button
						type="submit"
						disabled={isSubmitting}
						className="btn-primary w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? "Autenticando..." : "Iniciar Sessão"}
					</Button>
				</div>

				{/* --- Alerta de Erro Global (Root) --- */}
				{/* Sem espaço reservado: expande para baixo apenas quando há erro */}
				<AnimatePresence>
					{errors.root && (
						<motion.div
							initial={{ opacity: 0, height: 0, marginTop: 0 }}
							animate={{ opacity: 1, height: "auto", marginTop: 16 }}
							exit={{ opacity: 0, height: 0, marginTop: 0 }}
							transition={{ duration: 0.25, ease: "easeInOut" }}
							className="overflow-hidden"
						>
							<div className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-3">
								<p className="text-sm font-medium text-red-400">
									{errors.root.message}
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</form>

			{/* --- Divisor e SSO --- */}
			<div
				className="mt-8 animate-fade-up delay-500 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-zinc-800/80" />
					</div>
					<div className="relative flex justify-center text-xs">
						<span className="bg-[#121214] px-3 text-zinc-500">
							Ou entre com
						</span>
					</div>
				</div>

				<div className="mt-4 grid grid-cols-2 gap-3">
					<Button
						variant="outline"
						type="button"
						className="btn-sso border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:bg-zinc-950/50 hover:text-zinc-400"
					>
						<Fingerprint className="mr-2 h-4 w-4" /> Biometria
					</Button>
					<Button
						variant="outline"
						type="button"
						className="btn-sso border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:bg-zinc-950/50 hover:text-zinc-400"
					>
						<Key className="mr-2 h-4 w-4" /> Passkey
					</Button>
				</div>
			</div>
		</div>
	);
}
