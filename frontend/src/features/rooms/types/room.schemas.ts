import { z } from "zod";

/**
 * Base schema for room validation, mirroring the C# backend rules.
 */
export const roomBaseSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "O nome do ambiente é obrigatório.")
		.max(50, "O nome do ambiente não pode passar de 50 caracteres."),
	icon: z
		.string()
		.trim()
		.min(1, "O ícone do ambiente é obrigatório."),
});

export const createRoomSchema = roomBaseSchema;
export const updateRoomSchema = roomBaseSchema;

export type CreateRoomFormInput = z.input<typeof createRoomSchema>;
export type CreateRoomFormOutput = z.output<typeof createRoomSchema>;

export type UpdateRoomFormInput = z.input<typeof updateRoomSchema>;
export type UpdateRoomFormOutput = z.output<typeof updateRoomSchema>;