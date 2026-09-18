import { Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useAuthErrorTranslator } from "../hooks/useAuthErrorTranslator";
import { useLoginForm } from "../hooks/useLoginForm";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function LoginForm() {
	const { t } = useTranslation("auth");
	const translateError = useAuthErrorTranslator();
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
	} = useLoginForm();

	return (
		<div className="relative w-full p-6 sm:p-8">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5">
				<h2 className="mb-1 text-2xl sm:text-3xl font-semibold text-foreground">
					{t("login.title")}
				</h2>
				<p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
			</div>

			<form
				onSubmit={handleFormSubmit}
				noValidate
				className="flex flex-col gap-1"
			>
				<FormInput
					id="email"
					label={t("login.emailLabel")}
					type="email"
					autoComplete="email"
					placeholder={t("login.emailPlaceholder")}
					icon={<Mail className="h-4 w-4" />}
					registration={register("email")}
					error={translateError(errors.email?.message)}
					delayClass="delay-200"
				/>

				<PasswordInput
					id="password"
					label={t("login.passwordLabel")}
					autoComplete="current-password"
					placeholder="••••••••"
					registration={register("password")}
					error={translateError(errors.password?.message)}
					delayClass="delay-300"
					labelRight={
						<Link
							to="/forgot-password"
							// -m-1 p-1: alvo de toque de ao menos 24x24px (WCAG 2.2 AA Target
							// Size) sem deslocar o texto visualmente (padding pra dentro,
							// margem negativa pra fora cancela o espaço extra).
							className="inline-block -m-1 p-1 text-xs text-primary/90 transition-colors hover:text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
						>
							{t("login.forgotPassword")}
						</Link>
					}
				/>

				<div
					className="pt-1 animate-fade-up delay-400 opacity-0-init"
					style={{ animationFillMode: "forwards" }}
				>
					<Button
						type="submit"
						disabled={isSubmitting}
						ripple
						className="h-11 w-full rounded-lg border border-border bg-surface-high text-sm font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
								{t("login.submitting")}
							</>
						) : (
							t("login.submitButton")
						)}
					</Button>
				</div>

				<FormGlobalError error={translateError(errors.root?.message)} />
			</form>

			<div
				className="flex items-center gap-3 my-3 animate-fade-up delay-600 opacity-0-init text-xs uppercase text-muted-foreground"
				style={{ animationFillMode: "forwards" }}
			>
				<span className="h-px flex-1 bg-border-subtle" />
				<span className="shrink-0 font-medium tracking-wider">
					{t("login.orContinueWith")}
				</span>
				<span className="h-px flex-1 bg-border-subtle" />
			</div>

			<div
				className="mt-3 animate-fade-up delay-700 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<GoogleAuthButton />
			</div>

			<div
				className="mt-4 text-center animate-fade-up delay-800 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<p className="text-sm text-muted-foreground">
					{t("login.noAccount")}{" "}
					<Link
						to="/register"
						className="font-medium text-primary transition-colors hover:underline"
					>
						{t("login.signUp")}
					</Link>
				</p>
			</div>
		</div>
	);
}
