import { Loader2, Mail } from "lucide-react";
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

	const translateError = (errorKey?: string) => {
		if (!errorKey) return undefined;
		return t(errorKey, errorKey);
	};

	return (
		<div
			className="relative w-full max-w-95 overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
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
							className="text-xs text-primary/90 transition-colors hover:text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
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
				className="relative mt-3 animate-fade-up delay-600 opacity-0-init"
				style={{ animationFillMode: "forwards" }}
			>
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-border-subtle" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-surface-low px-2 text-muted-foreground">
						{t("login.orContinueWith")}
					</span>
				</div>
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
