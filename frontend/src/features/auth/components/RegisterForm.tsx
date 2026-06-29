import { Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/components/shared/forms/FormGlobalError";
import { FormInput } from "@/components/shared/forms/FormInput";
import { PasswordInput } from "@/components/shared/forms/PasswordInput";
import { Button } from "@/components/ui/button";
import { useRegisterForm } from "../hooks/useRegisterForm";

export function RegisterForm() {
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
	} = useRegisterForm();

	return (
		<div
			className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-8">
				<h2 className="mb-1 text-3xl font-semibold text-zinc-50">
					Criar Conta
				</h2>
				<p className="text-sm text-zinc-400">
					Preencha seus dados para ingressar no ecossistema.
				</p>
			</div>

			<form onSubmit={handleFormSubmit} noValidate className="space-y-2.5">
				<FormInput
					id="name"
					label="Nome Completo"
					icon={<User className="h-4 w-4" />}
					type="text"
					autoComplete="name"
					placeholder="Seu nome"
					registration={register("name")}
					error={errors.name?.message}
					delayClass="delay-200"
				/>

				<FormInput
					id="email"
					label="Email"
					icon={<Mail className="h-4 w-4" />}
					type="email"
					autoComplete="email"
					placeholder="admin@smart.local"
					registration={register("email")}
					error={errors.email?.message}
					delayClass="delay-300"
				/>

				<PasswordInput
					id="password"
					label="Senha"
					autoComplete="new-password"
					placeholder="••••••••"
					registration={register("password")}
					error={errors.password?.message}
					delayClass="delay-400"
				/>

				<PasswordInput
					id="confirmPassword"
					label="Confirmar Senha"
					autoComplete="new-password"
					placeholder="••••••••"
					registration={register("confirmPassword")}
					error={errors.confirmPassword?.message}
					delayClass="delay-500"
				/>

				<div
					className="pt-2 animate-fade-up delay-600 opacity-0-init"
					style={{ animationFillMode: "forwards" }}
				>
					<Button
						type="submit"
						disabled={isSubmitting}
						className="btn-primary w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? "Criando conta..." : "Criar Conta"}
					</Button>
				</div>

				<FormGlobalError error={errors.root?.message} />
			</form>

			<div
				className="mt-6 text-center animate-fade-up delay-700 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<p className="text-sm text-zinc-400">
					Já possui uma conta?{" "}
					<Link
						to="/login"
						className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
					>
						Faça login
					</Link>
				</p>
			</div>
		</div>
	);
}
