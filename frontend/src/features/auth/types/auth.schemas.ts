import { z } from "zod";

const emailValidation = z.email("Digite um formato de e-mail válido.");

export const loginSchema = z.object({
	email: emailValidation,
	password: z.string().min(1, "A senha é obrigatória."),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
	email: emailValidation,
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const registerSchema = z
	.object({
		name: z.string().min(3, "register.errors.nameMin"),
		email: z.email("register.errors.emailInvalid"),
		password: z
			.string()
			.min(8, "register.errors.passwordMin")
			.regex(/[A-Z]/, "register.errors.passwordUppercase")
			.regex(/[0-9]/, "register.errors.passwordNumber")
			.regex(/[^a-zA-Z0-9]/, "register.errors.passwordSpecial"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "register.errors.passwordMismatch",
		path: ["confirmPassword"],
	});
export type RegisterFormData = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z
	.object({
		password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As senhas não coincidem.",
		path: ["confirmPassword"],
	});
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
