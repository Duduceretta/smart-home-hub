import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { registerWithEmail } from "../api/auth.api";
import { useAuthStore } from "../store/useAuthStore";
import { type RegisterFormData, registerSchema } from "../types/auth.schemas";

export function useRegisterForm() {
	const setUser = useAuthStore((state) => state.setUser);
	const navigate = useNavigate();

	const formMethods = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		mode: "onSubmit",
        reValidateMode: "onChange",
	});

	const handleFormSubmit = async (data: RegisterFormData) => {
		try {
			const user = await registerWithEmail(data);
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
					message: "Ocorreu um erro crítico e inesperado ao cadastrar.",
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
