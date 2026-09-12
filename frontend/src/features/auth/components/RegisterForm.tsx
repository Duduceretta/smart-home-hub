import { Loader2, Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function RegisterForm() {
	const { t } = useTranslation("auth");
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
	} = useRegisterForm();

	const translateError = (errorKey?: string) => {
		if (!errorKey) return undefined;
		return t(errorKey, errorKey);
	};

	return (
		<div
			className="relative w-full max-w-102 overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
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
				className="relative mt-2.5 animate-fade-up delay-600 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-border-subtle" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-surface-low px-2 text-muted-foreground backdrop-blur-sm">
						{t("register.orContinueWith")}
					</span>
				</div>
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
