import { z } from "zod";

/**
 * Base schema for device-group validation, mirroring the C# backend rules.
 * `deviceIds` min(1) is a frontend-only constraint — the backend accepts an
 * empty array on PUT to clear a group's devices, but the UI always requires
 * at least one device selected on both create and edit.
 */
export const deviceGroupBaseSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "O nome do grupo é obrigatório.")
		.max(100, "O nome do grupo deve ter no máximo 100 caracteres."),
	icon: z
		.string()
		.trim()
		.max(50, "O nome do ícone deve ter no máximo 50 caracteres.")
		.optional()
		.or(z.literal("")),
	deviceIds: z
		.array(z.string())
		.min(1, "Selecione pelo menos um dispositivo para o grupo."),
});

export const createDeviceGroupSchema = deviceGroupBaseSchema;
export const updateDeviceGroupSchema = deviceGroupBaseSchema;

export type CreateDeviceGroupFormInput = z.input<
	typeof createDeviceGroupSchema
>;
export type CreateDeviceGroupFormOutput = z.output<
	typeof createDeviceGroupSchema
>;

export type UpdateDeviceGroupFormInput = z.input<
	typeof updateDeviceGroupSchema
>;
export type UpdateDeviceGroupFormOutput = z.output<
	typeof updateDeviceGroupSchema
>;
