import { z } from "zod";
import { DeviceTypeEnum } from "./devices.types";

/**
 * Array of valid device type integer values extracted from DeviceTypeEnum.
 */
const VALID_DEVICE_TYPES = Object.values(DeviceTypeEnum) as number[];

/**
 * Base schema definition matching C# CreateDeviceCommandValidator & UpdateDeviceCommandValidator.
 * Fully compatible with Zod v4 syntax.
 */
export const deviceBaseSchema = z.object({
	name: z
		.string()
		.min(2, "O nome deve ter pelo menos 2 caracteres")
		.max(100, "O nome pode ter no máximo 100 caracteres"),

	brand: z
		.string()
		.min(2, "A marca é obrigatória")
		.max(50, "A marca pode ter no máximo 50 caracteres"),

	externalId: z
		.string()
		.min(3, "O identificador físico (MAC/ID) é obrigatório")
		.regex(
			/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[A-Za-z0-9-_]+$/,
			"Digite um MAC address (ex: AA:BB:CC:11:22:33) ou ID válido",
		),

	ipAddress: z
		.union([
			z.ipv4({ message: "Endereço IPv4 inválido (ex: 192.168.1.50)" }),
			z.literal(""),
			z.null(),
		])
		.optional()
		.transform((val) => (val && val.trim() !== "" ? val : null)),

	type: z.coerce
		.number({ message: "Selecione um tipo de dispositivo válido" })
		.refine((val) => VALID_DEVICE_TYPES.includes(val), {
			message: "O tipo de dispositivo fornecido é inválido",
		})
		.transform((val) => val as DeviceTypeEnum),

	roomId: z
		.string()
		.nullable()
		.optional()
		.transform((val) => (val && val.trim() !== "" ? val : null)),
});

export const createDeviceSchema = deviceBaseSchema;
export const updateDeviceSchema = deviceBaseSchema;

export type CreateDeviceFormInput = z.input<typeof createDeviceSchema>;
export type CreateDeviceFormOutput = z.output<typeof createDeviceSchema>;

export type UpdateDeviceFormInput = z.input<typeof updateDeviceSchema>;
export type UpdateDeviceFormOutput = z.output<typeof updateDeviceSchema>;
