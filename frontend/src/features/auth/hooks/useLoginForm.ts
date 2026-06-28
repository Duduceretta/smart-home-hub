import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginWithEmail } from "../api/auth.api";
import { useAuthStore } from "../store/useAuthStore";
import { type LoginFormData, loginSchema } from "../types/loginSchema";

export function useLoginForm() {
	const [showPassword, setShowPassword] = useState(false);
	const setUser = useAuthStore((state) => state.setUser);

	const formMethods = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const handleFormSubmit = async (data: LoginFormData) => {
		try {
			const user = await loginWithEmail(data);
			setUser(user);

			// 3. Redireciona para o Dashboard (descomente quando tiver as rotas)
			// navigate("/dashboard");

			console.log("Login de sucesso!", user.email);
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
		showPassword,
		setShowPassword,
		handleFormSubmit: formMethods.handleSubmit(handleFormSubmit),
		isSubmitting: formMethods.formState.isSubmitting,
	};
}
