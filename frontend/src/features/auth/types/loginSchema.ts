import { z } from "zod";

export const loginSchema = z.object({
	email: z.email("Digite um formato de e-mail válido."),
	password: z.string().min(1, "A senha é obrigatória."),
});

export type LoginFormData = z.infer<typeof loginSchema>;
