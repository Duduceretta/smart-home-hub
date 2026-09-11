import { AlertCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useResetPasswordForm } from "../hooks/useResetPasswordForm";

export function ResetPasswordSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="flex flex-col gap-4 py-2 animate-pulse"
		>
			<span className="sr-only">Validando token de recuperação...</span>
			{/* Campo de Senha */}
			<div className="space-y-1.5">
				<div className="h-3.5 w-24 rounded bg-surface-high/80" />
				<div className="h-11 w-full rounded-lg border border-border-subtle bg-surface-container" />
				<div className="h-4.5 w-32 rounded bg-surface-high/40" />
			</div>
			{/* Campo de Confirmação */}
			<div className="space-y-1.5">
				<div className="h-3.5 w-36 rounded bg-surface-high/80" />
				<div className="h-11 w-full rounded-lg border border-border-subtle bg-surface-container" />
				<div className="h-4.5 w-32 rounded bg-surface-high/40" />
			</div>
			{/* Botão de Envio */}
			<div className="pt-2 mt-2">
				<div className="h-11 w-full rounded-lg bg-surface-high" />
			</div>
		</div>
	);
}

export function ResetPasswordForm() {
	const { t } = useTranslation("auth");
	const [searchParams] = useSearchParams();
	const email = searchParams.get("email") || "";

	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
		isVerifying,
		email: userEmail,
		tokenError,
	} = useResetPasswordForm();

	const displayEmail = email || userEmail;

	return (
		<div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-fade-up">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-6 sm:mb-8">
				<h2 className="mb-1 text-2xl sm:text-3xl font-semibold text-foreground">
					{t("resetPassword.title")}
				</h2>
				{displayEmail && !tokenError && (
					<p className="text-sm text-muted-foreground">
						{t("resetPassword.resettingFor")}{" "}
						<span className="text-primary font-medium">{displayEmail}</span>
					</p>
				)}
			</div>

			{isVerifying ? (
				<ResetPasswordSkeleton />
			) : tokenError ? (
				<div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
					<AlertCircle className="h-12 w-12 text-destructive" />
					<p className="text-sm font-medium text-destructive">{tokenError}</p>
					<Link
						to="/forgot-password"
						className="mt-4 flex items-center text-sm font-medium text-primary transition-colors hover:underline"
					>
						{t("resetPassword.requestNewLink")}
					</Link>
				</div>
			) : (
				<form
					onSubmit={handleFormSubmit}
					noValidate
					className="flex flex-col gap-1"
				>
					<PasswordInput
						id="password"
						label={t("resetPassword.passwordLabel")}
						autoComplete="new-password"
						placeholder="••••••••"
						registration={register("password")}
						error={errors.password?.message}
						delayClass="delay-200"
					/>

					<PasswordInput
						id="confirmPassword"
						label={t("resetPassword.confirmPasswordLabel")}
						autoComplete="new-password"
						placeholder="••••••••"
						registration={register("confirmPassword")}
						error={errors.confirmPassword?.message}
						delayClass="delay-300"
					/>

					<div
						className="pt-2 mt-2 animate-fade-up delay-400 opacity-0-init"
						style={{ animationFillMode: "forwards" }}
					>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="h-11 w-full rounded-lg border border-border bg-surface-high text-sm font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
						>
							{isSubmitting
								? t("resetPassword.submitting")
								: t("resetPassword.submitButton")}
						</Button>
					</div>

					<FormGlobalError error={errors.root?.message} />

					<div
						className="mt-6 text-center animate-fade-up delay-500 opacity-0-init"
						style={{ animationFillMode: "forwards" }}
					>
						<Link
							to="/login"
							className="flex items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("resetPassword.backToLogin")}
						</Link>
					</div>
				</form>
			)}
		</div>
	);
}
