import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { PasswordInput } from "@/core/components/forms/PasswordInput";
import { Button } from "@/core/components/ui/button";
import { useResetPasswordForm } from "../hooks/useResetPasswordForm";

export function ResetPasswordForm() {
	const { t } = useTranslation("auth");
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
		<div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-fade-up">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-6 sm:mb-8">
				<h2 className="mb-1 text-2xl sm:text-3xl font-semibold text-foreground">
					{t("resetPassword.title")}
				</h2>
				{email && !tokenError && (
					<p className="text-sm text-muted-foreground">
						{t("resetPassword.resettingFor")}{" "}
						<span className="text-primary font-medium">{email}</span>
					</p>
				)}
			</div>

			{isVerifying ? (
				<div className="flex flex-col items-center justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="mt-4 text-sm text-muted-foreground">
						{t("resetPassword.verifying")}
					</p>
				</div>
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
							className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
