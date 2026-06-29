import { z } from "zod";

export const registerSchema = z
	.object({
		name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
		email: z.email("Digite um formato de e-mail válido."),
		password: z
			.string()
			.min(8, "A senha deve ter no mínimo 8 caracteres.")
			.regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
			.regex(/[0-9]/, "A senha deve conter pelo menos um número.")
			.regex(
				/[^a-zA-Z0-9]/,
				"A senha deve conter pelo menos um caractere especial.",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As senhas não coincidem.",
		path: ["confirmPassword"],
	});

export type RegisterFormData = z.infer<typeof registerSchema>;
