import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPassword } from "../api/auth.api";
import { type ForgotPasswordFormData, forgotPasswordSchema } from "../types/auth.schemas";

export function useForgotPasswordForm() {
    const [isSuccess, setIsSuccess] = useState(false);

    const formMethods = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
    });

    const handleFormSubmit = async (data: ForgotPasswordFormData) => {
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