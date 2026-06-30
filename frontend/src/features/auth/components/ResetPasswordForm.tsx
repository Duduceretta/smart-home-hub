import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/components/shared/forms/FormGlobalError";
import { PasswordInput } from "@/components/shared/forms/PasswordInput";
import { Button } from "@/components/ui/button";
import { useResetPasswordForm } from "../hooks/useResetPasswordForm";

export function ResetPasswordForm() {
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
		isVerifying,
		email,
		tokenError,
	} = useResetPasswordForm();

	return (
		<div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl animate-fade-up">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-6">
				<h2 className="mb-1 text-3xl font-semibold text-zinc-50">Nova Senha</h2>
				{email && !tokenError && (
					<p className="text-sm text-zinc-400">
						Redefinindo senha para{" "}
						<span className="text-indigo-400">{email}</span>
					</p>
				)}
			</div>

			{/* ESTADO 1: VERIFICANDO URL */}
			{isVerifying ? (
				<div className="flex flex-col items-center justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
					<p className="mt-4 text-sm text-zinc-400">
						Validando o link seguro...
					</p>
				</div>
			) : tokenError ? (
				/* ESTADO 2: LINK EXPIRADO/INVÁLIDO */
				<div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
					<AlertCircle className="h-12 w-12 text-red-500" />
					<p className="text-sm font-medium text-red-400">{tokenError}</p>
					<Link
						to="/forgot-password"
						className="mt-4 flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300"
					>
						Solicitar novo link
					</Link>
				</div>
			) : (
				/* ESTADO 3: FORMULÁRIO DE NOVA SENHA */
				<form
					onSubmit={handleFormSubmit}
					noValidate
					className="flex flex-col gap-1"
				>
					<PasswordInput
						id="password"
						label="Nova Senha"
						autoComplete="new-password"
						placeholder="••••••••"
						registration={register("password")}
						error={errors.password?.message}
					/>

					<PasswordInput
						id="confirmPassword"
						label="Confirmar Nova Senha"
						autoComplete="new-password"
						placeholder="••••••••"
						registration={register("confirmPassword")}
						error={errors.confirmPassword?.message}
					/>

					<div className="pt-2 mt-2">
						<Button
							type="submit"
							disabled={isSubmitting}
							className="btn-primary w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
						>
							{isSubmitting ? "Redefinindo..." : "Salvar nova senha"}
						</Button>
					</div>

					<FormGlobalError error={errors.root?.message} />

					<div className="mt-6 text-center">
						<Link
							to="/login"
							className="flex items-center justify-center text-sm font-medium text-zinc-400 hover:text-indigo-300"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Voltar para o login
						</Link>
					</div>
				</form>
			)}
		</div>
	);
}
