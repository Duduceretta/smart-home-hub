import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useAuthErrorTranslator } from "../hooks/useAuthErrorTranslator";
import { useResetPasswordForm } from "../hooks/useResetPasswordForm";

export function ResetPasswordSkeleton() {
	const { t } = useTranslation("auth");
	return (
		<div
			role="status"
			aria-busy="true"
			className="flex flex-col gap-4 py-2 animate-pulse"
		>
			<span className="sr-only">
				{t(
					"resetPassword.validatingToken",
					"Validando token de recuperação...",
				)}
			</span>
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
	const translateError = useAuthErrorTranslator();
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
		<div className="relative w-full max-w-95 overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl animate-fade-up">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5">
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
				<div className="flex flex-col items-center justify-center py-4 text-center animate-fade-up">
					<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-surface-container text-muted-foreground shadow-xs">
						<KeyRound className="h-6 w-6" aria-hidden="true" />
					</div>
					<h3 className="mb-1.5 text-lg font-semibold text-foreground">
						{t("resetPassword.tokenInvalidTitle")}
					</h3>
					<p className="mb-4 max-w-xs text-sm text-muted-foreground">
						{translateError(tokenError) ||
							t("resetPassword.tokenInvalidDescription")}
					</p>
					<Link
						to="/forgot-password"
						className="inline-flex h-10 items-center justify-center rounded-lg bg-surface-high px-4 text-sm font-medium text-foreground border border-border transition-colors hover:bg-surface-highest"
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
						error={translateError(errors.password?.message)}
						delayClass="delay-200"
					/>

					<PasswordInput
						id="confirmPassword"
						label={t("resetPassword.confirmPasswordLabel")}
						autoComplete="new-password"
						placeholder="••••••••"
						registration={register("confirmPassword")}
						error={translateError(errors.confirmPassword?.message)}
						delayClass="delay-300"
					/>

					<div
						className="pt-2 mt-2 animate-fade-up delay-400 opacity-0-init"
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
									{t("resetPassword.submitting")}
								</>
							) : (
								t("resetPassword.submitButton")
							)}
						</Button>
					</div>

					<FormGlobalError error={translateError(errors.root?.message)} />

					<div
						className="mt-4 text-center animate-fade-up delay-500 opacity-0-init"
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
