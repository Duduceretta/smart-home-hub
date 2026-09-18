import { Loader2, Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useAuthErrorTranslator } from "../hooks/useAuthErrorTranslator";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function RegisterForm() {
	const { t } = useTranslation("auth");
	const translateError = useAuthErrorTranslator();
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
	} = useRegisterForm();

	return (
		<div className="relative w-full p-6 sm:p-8">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5">
				<h2 className="mb-1 text-2xl sm:text-3xl font-semibold text-foreground">
					{t("register.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("register.subtitle")}
				</p>
			</div>

			<form
				onSubmit={handleFormSubmit}
				noValidate
				className="flex flex-col gap-1"
			>
				<FormInput
					id="name"
					label={t("register.nameLabel")}
					icon={<User className="h-4 w-4" />}
					type="text"
					autoComplete="name"
					placeholder={t("register.namePlaceholder")}
					registration={register("name")}
					error={translateError(errors.name?.message)}
					delayClass="delay-200"
				/>

				<FormInput
					id="email"
					label={t("register.emailLabel")}
					icon={<Mail className="h-4 w-4" />}
					type="email"
					autoComplete="email"
					placeholder={t("register.emailPlaceholder")}
					registration={register("email")}
					error={translateError(errors.email?.message)}
					delayClass="delay-300"
				/>

				<PasswordInput
					id="password"
					label={t("register.passwordLabel")}
					autoComplete="new-password"
					placeholder="••••••••"
					registration={register("password")}
					error={translateError(errors.password?.message)}
					delayClass="delay-400"
				/>

				<PasswordInput
					id="confirmPassword"
					label={t("register.confirmPasswordLabel")}
					autoComplete="new-password"
					placeholder="••••••••"
					registration={register("confirmPassword")}
					error={translateError(errors.confirmPassword?.message)}
					delayClass="delay-500"
				/>

				<div
					className="pt-1 animate-fade-up delay-600 opacity-0-init"
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
								{t("register.submitting")}
							</>
						) : (
							t("register.submitButton")
						)}
					</Button>

					<p className="mt-2 text-center text-xs text-muted-foreground leading-normal text-balance">
						{t("register.termsConsentPrefix")}{" "}
						<Link
							to="/legal/terms"
							target="_blank"
							rel="noreferrer"
							className="underline underline-offset-2 decoration-border hover:decoration-muted-foreground transition-colors hover:text-foreground"
						>
							{t("register.termsOfService")}
						</Link>{" "}
						{t("register.and")}{" "}
						<Link
							to="/legal/privacy"
							target="_blank"
							rel="noreferrer"
							className="underline underline-offset-2 decoration-border hover:decoration-muted-foreground transition-colors hover:text-foreground"
						>
							{t("register.privacyPolicy")}
						</Link>
						.
					</p>
				</div>

				<FormGlobalError error={translateError(errors.root?.message)} />
			</form>

			<div
				className="flex items-center gap-3 my-2.5 animate-fade-up delay-600 opacity-0-init text-xs uppercase text-muted-foreground"
				style={{ animationFillMode: "forwards" }}
			>
				<span className="h-px flex-1 bg-border-subtle" />
				<span className="shrink-0 font-medium tracking-wider">
					{t("register.orContinueWith")}
				</span>
				<span className="h-px flex-1 bg-border-subtle" />
			</div>

			<div
				className="mt-2.5 animate-fade-up delay-700 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<GoogleAuthButton actionText={t("register.googleButton")} />
			</div>

			<div
				className="mt-3.5 text-center animate-fade-up delay-700 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<p className="text-sm text-muted-foreground">
					{t("register.hasAccount")}{" "}
					<Link
						to="/login"
						className="font-medium text-primary transition-colors hover:underline"
					>
						{t("register.signIn")}
					</Link>
				</p>
			</div>
		</div>
	);
}
