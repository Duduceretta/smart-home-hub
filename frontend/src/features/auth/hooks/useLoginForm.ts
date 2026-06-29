import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { loginWithEmail } from "../api/auth.api";
import { useAuthStore } from "../store/useAuthStore";
import { type LoginFormData, loginSchema } from "../types/loginSchema";

export function useLoginForm() {
	const setUser = useAuthStore((state) => state.setUser);
	const navigate = useNavigate();

	const formMethods = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const handleFormSubmit = async (data: LoginFormData) => {
		try {
			const user = await loginWithEmail(data);
			setUser(user);
			navigate("/dashboard");
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
		handleFormSubmit: formMethods.handleSubmit(handleFormSubmit),
		isSubmitting: formMethods.formState.isSubmitting,
	};
}
