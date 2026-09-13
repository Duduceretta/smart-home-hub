import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
	AuthError,
	submitNewPassword,
	verifyResetToken,
} from "../api/auth.api";
import {
	type ResetPasswordFormData,
	resetPasswordSchema,
} from "../types/auth.schemas";

export function useResetPasswordForm() {
	const { t } = useTranslation("auth");
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const [isVerifying, setIsVerifying] = useState(true);
	const [email, setEmail] = useState<string | null>(null);
	const [tokenError, setTokenError] = useState<string | null>(null);

	const oobCode = searchParams.get("oobCode");
	const mode = searchParams.get("mode");

	const formMethods = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});

	useEffect(() => {
		if (!oobCode || (mode && mode !== "resetPassword")) {
			setTokenError("resetPassword.errors.invalidOrExpiredToken");
			setIsVerifying(false);
			return;
		}

		const checkCode = async () => {
			try {
				const userEmail = await verifyResetToken(oobCode);
				setEmail(userEmail);
			} catch (error: unknown) {
				if (error instanceof Error) {
					setTokenError(error.message);
				} else {
					setTokenError("resetPassword.errors.invalidOrExpiredToken");
				}
			} finally {
				setIsVerifying(false);
			}
		};

		checkCode();
	}, [oobCode, mode]);

	const handleFormSubmit = async (data: ResetPasswordFormData) => {
		if (!oobCode) return;

		try {
			await submitNewPassword(oobCode, data.password);
			toast.success(
				t(
					"resetPassword.successToast",
					"Senha redefinida com sucesso! Faça login para continuar.",
				),
			);
			navigate("/login", { replace: true });
		} catch (error: unknown) {
			if (error instanceof AuthError) {
				formMethods.setError("root", {
					type: "manual",
					message: error.message,
				});
				return;
			}

			if (error instanceof Error) {
				formMethods.setError("root", {
					type: "manual",
					message: error.message,
				});
			} else {
				formMethods.setError("root", {
					type: "manual",
					message: "resetPassword.errors.generic",
				});
			}
		}
	};

	return {
		...formMethods,
		isVerifying,
		email,
		tokenError,
		handleFormSubmit: formMethods.handleSubmit(handleFormSubmit),
		isSubmitting: formMethods.formState.isSubmitting,
	};
}
