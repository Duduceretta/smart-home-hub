import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { Button } from "@/core/components/ui/button";
import { useForgotPasswordForm } from "../hooks/useForgotPasswordForm";

export function ForgotPasswordForm() {
	const { t } = useTranslation("auth");
	const {
		register,
		handleFormSubmit,
		formState: { errors },
		isSubmitting,
		isSuccess,
	} = useForgotPasswordForm();

	return (
		<div
			className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-fade-up delay-100 opacity-0-init"
			style={{ animationFillMode: "forwards" }}
		>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-6 sm:mb-8">
				<h2 className="mb-1 text-2xl sm:text-3xl font-semibold text-foreground">
					{t("forgotPassword.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("forgotPassword.subtitle")}
				</p>
			</div>

			{isSuccess ? (
				<div className="flex flex-col items-center justify-center space-y-4 py-6 text-center animate-fade-up">
					<CheckCircle2 className="h-12 w-12 text-primary" />
					<p className="text-sm font-medium text-foreground">
						{t("forgotPassword.successMessage")}
					</p>
					<Link
						to="/login"
						className="mt-4 flex items-center text-sm font-medium text-primary transition-colors hover:underline"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t("forgotPassword.backToLogin")}
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
						label={t("forgotPassword.emailLabel")}
						icon={<Mail className="h-4 w-4" />}
						type="email"
						autoComplete="email"
						placeholder={t("forgotPassword.emailPlaceholder")}
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
							className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
						>
							{isSubmitting
								? t("forgotPassword.submitting")
								: t("forgotPassword.submitButton")}
						</Button>
					</div>

					<FormGlobalError error={errors.root?.message} />

					<div
						className="mt-8 text-center animate-fade-up delay-400 opacity-0-init"
						style={{ animationFillMode: "forwards" }}
					>
						<Link
							to="/login"
							className="flex items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("forgotPassword.rememberedPassword")}
						</Link>
					</div>
				</form>
			)}
		</div>
	);
}
