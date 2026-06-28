import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
	type LoginFormData,
	loginSchema,
} from "@/features/auth/types/loginSchema";

export function useLoginForm() {
	const [showPassword, setShowPassword] = useState(false);

	const formMethods = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const handleFormSubmit = async (data: LoginFormData) => {
		console.log("Hooks: Dados validados prontos para o Firebase:", data);
		await new Promise((resolve) => setTimeout(resolve, 2000));
	};

	return {
		...formMethods,
		showPassword,
		setShowPassword,
		handleFormSubmit: formMethods.handleSubmit(handleFormSubmit),
		isSubmitting: formMethods.formState.isSubmitting,
	};
}
