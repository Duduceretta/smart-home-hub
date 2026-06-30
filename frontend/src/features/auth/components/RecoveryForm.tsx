import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/components/shared/forms/FormGlobalError";
import { FormInput } from "@/components/shared/forms/FormInput";
import { Button } from "@/components/ui/button";
import { useRecoveryForm } from "../hooks/useRecoveryForm";

export function RecoveryForm() {
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
		isSuccess,
	} = useRecoveryForm();

	return (
		<div
			className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-6">
				<h2 className="mb-1 text-3xl font-semibold text-zinc-50">
					Recuperar Senha
				</h2>
				<p className="text-sm text-zinc-400">
					Enviaremos um link seguro para você redefinir seu acesso.
				</p>
			</div>

			{/* Renderização Condicional: Sucesso ou Formulário */}
			{isSuccess ? (
				<div className="flex flex-col items-center justify-center space-y-4 py-6 text-center animate-fade-up">
					<CheckCircle2 className="h-12 w-12 text-emerald-500" />
					<p className="text-sm font-medium text-zinc-300">
						Se o e-mail estiver cadastrado em nosso sistema, você receberá um
						link de recuperação em breve.
					</p>
					<Link
						to="/login"
						className="mt-4 flex items-center text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar para o login
					</Link>
				</div>
			) : (
				<form
					onSubmit={handleFormSubmit}
					noValidate
					className="flex flex-col gap-1"
				>
					<FormInput
						id="email"
						label="Email cadastrado"
						icon={<Mail className="h-4 w-4" />}
						type="email"
						autoComplete="email"
						placeholder="admin@smart.local"
						registration={register("email")}
						error={errors.email?.message}
						delayClass="delay-200"
					/>

					<div
						className="pt-2 animate-fade-up delay-300 opacity-0-init"
						style={{ animationFillMode: "forwards" }}
					>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="btn-primary w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
						</Button>
					</div>

					<FormGlobalError error={errors.root?.message} />

					<div
						className="mt-8 text-center animate-fade-up delay-400 opacity-0-init"
						style={{ animationFillMode: "forwards" }}
					>
						<Link
							to="/login"
							className="flex items-center justify-center text-sm font-medium text-zinc-400 transition-colors hover:text-indigo-300"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Lembrei minha senha
						</Link>
					</div>
				</form>
			)}
		</div>
	);
}
