import { z } from "zod";

export const recoverySchema = z.object({
    email: z.email("Digite um formato de e-mail válido."),
});

export type RecoveryFormData = z.infer<typeof recoverySchema>;