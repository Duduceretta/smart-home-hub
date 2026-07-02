import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { submitNewPassword, verifyResetToken } from "../api/auth.api";
import {
	type ResetPasswordFormData,
	resetPasswordSchema,
} from "../types/auth.schemas";

export function useResetPasswordForm() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const [isVerifying, setIsVerifying] = useState(true);
	const [email, setEmail] = useState<string | null>(null);
	const [tokenError, setTokenError] = useState<string | null>(null);

	const oobCode = searchParams.get("oobCode");

	const formMethods = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
		mode: "onSubmit",
        reValidateMode: "onChange",
	});

	useEffect(() => {
		if (!oobCode) {
			setTokenError("Nenhum código de recuperação foi encontrado na URL.");
			setIsVerifying(false);
			return;
		}

		const checkCode = async () => {
			try {
				const userEmail = await verifyResetToken(oobCode);
				setEmail(userEmail);
			} catch (error: unknown) {
				if (error instanceof Error) setTokenError(error.message);
			} finally {
				setIsVerifying(false);
			}
		};

		checkCode();
	}, [oobCode]);

	const handleFormSubmit = async (data: ResetPasswordFormData) => {
		if (!oobCode) return;

		try {
			await submitNewPassword(oobCode, data.password);
			toast.success("Senha redefinida com sucesso! Faça login para continuar.");
			navigate("/login");
		} catch (error: unknown) {
			if (error instanceof Error) {
				formMethods.setError("root", {
					type: "manual",
					message: error.message,
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
