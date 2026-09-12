import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { Logger } from "@/core/logger/app.logger";
import {
	AuthError,
	registerWithEmail,
	sendVerificationEmail,
} from "../api/auth.api";
import { useAuthStore } from "../store/useAuthStore";
import { type RegisterFormData, registerSchema } from "../types/auth.schemas";

export function useRegisterForm() {
	const setUser = useAuthStore((state) => state.setUser);
	const navigate = useNavigate();
	const location = useLocation();

	const formMethods = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});

	const handleFormSubmit = async (data: RegisterFormData) => {
		try {
			const user = await registerWithEmail(data);
			setUser(user);

			// Disparo assíncrono e não-bloqueante do e-mail de confirmação
			sendVerificationEmail(data.email).catch((error) => {
				Logger.warn(
					"Falha não-bloqueante ao despachar e-mail de verificação inicial",
					error,
				);
			});

			const fromState = (
				location.state as {
					from?: { pathname: string; search?: string; hash?: string } | string;
				}
			)?.from;
			const destination =
				typeof fromState === "string"
					? fromState
					: fromState?.pathname
						? `${fromState.pathname}${fromState.search || ""}${fromState.hash || ""}`
						: "/dashboard";

			navigate(destination, { replace: true });
		} catch (error: unknown) {
			if (error instanceof AuthError) {
				if (
					error.code === "auth/email-already-in-use" ||
					error.code === "auth/invalid-email"
				) {
					formMethods.setError("email", {
						type: "manual",
						message: error.message,
					});
					return;
				}
				if (error.code === "auth/weak-password") {
					formMethods.setError("password", {
						type: "manual",
						message: error.message,
					});
					return;
				}
			}

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
