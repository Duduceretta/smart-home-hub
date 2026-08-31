import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useLoginForm } from "../hooks/useLoginForm";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function LoginForm() {
	const { t } = useTranslation("auth");
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
	} = useLoginForm();

	return (
		<div
			className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-8">
				<h2 className="mb-1 text-3xl font-semibold text-zinc-50">
					{t("login.title")}
				</h2>
				<p className="text-sm text-zinc-400">{t("login.subtitle")}</p>
			</div>

			<form onSubmit={handleFormSubmit} noValidate className="space-y-2.5">
				<FormInput
					id="email"
					label={t("login.emailLabel")}
					type="email"
					autoComplete="email"
					placeholder={t("login.emailPlaceholder")}
					icon={<Mail className="h-4 w-4" />}
					registration={register("email")}
					error={errors.email?.message}
					delayClass="delay-200"
				/>

				<PasswordInput
					id="password"
					label={t("login.passwordLabel")}
					autoComplete="current-password"
					placeholder="••••••••"
					registration={register("password")}
					error={errors.password?.message}
					delayClass="delay-300"
					labelRight={
						<Link
							to="/forgot-password"
							className="text-xs text-indigo-400 transition-colors hover:text-indigo-300"
							tabIndex={-1}
						>
							{t("login.forgotPassword")}
						</Link>
					}
				/>

				<div
					className="pt-2 animate-fade-up delay-400 opacity-0-init"
					style={{ animationFillMode: "forwards" }}
				>
					<Button
						type="submit"
						disabled={isSubmitting}
						className="btn-primary w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isSubmitting ? t("login.submitting") : t("login.submitButton")}
					</Button>
				</div>

				<FormGlobalError error={errors.root?.message} />
			</form>

			<div
				className="relative mt-6 animate-fade-up delay-600 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-zinc-800/80" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-[#121215] px-2 text-zinc-500">
						{t("login.orContinueWith")}
					</span>
				</div>
			</div>

			<div
				className="mt-6 animate-fade-up delay-700 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<GoogleAuthButton />
			</div>

			<div
				className="mt-6 text-center animate-fade-up delay-800 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<p className="text-sm text-zinc-400">
					{t("login.noAccount")}{" "}
					<Link
						to="/register"
						className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
					>
						{t("login.signUp")}
					</Link>
				</p>
			</div>
		</div>
	);
}
