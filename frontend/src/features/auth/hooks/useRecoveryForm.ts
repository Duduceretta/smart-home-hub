import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPassword } from "../api/auth.api";
import { type RecoveryFormData, recoverySchema } from "../types/recoverySchema";

export function useRecoveryForm() {
	const [isSuccess, setIsSuccess] = useState(false);

	const formMethods = useForm<RecoveryFormData>({
		resolver: zodResolver(recoverySchema),
	});

	const handleFormSubmit = async (data: RecoveryFormData) => {
		try {
			await resetPassword(data.email);
			setIsSuccess(true);
		} catch (error: unknown) {
			if (error instanceof Error) {
				formMethods.setError("root", {
					type: "manual",
					message: error.message,
				});
			} else {
				formMethods.setError("root", {
					type: "manual",
					message: "Ocorreu um erro crítico e inesperado.",
				});
			}
		}
	};

	return {
		...formMethods,
		isSuccess,
		handleFormSubmit: formMethods.handleSubmit(handleFormSubmit),
		isSubmitting: formMethods.formState.isSubmitting,
	};
}
