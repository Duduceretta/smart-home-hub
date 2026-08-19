import { z } from "zod";
import { DeviceTypeEnum, IntegrationTypeEnum } from "./devices.types";

/**
 * Array of valid device type integer values extracted from DeviceTypeEnum.
 */
const VALID_DEVICE_TYPES = Object.values(DeviceTypeEnum) as number[];

/**
 * Array of valid integration type integer values extracted from IntegrationTypeEnum.
 */
const VALID_INTEGRATION_TYPES = Object.values(IntegrationTypeEnum) as number[];

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

	integrationType: z.coerce
		.number({ message: "Selecione um tipo de integração válido" })
		.refine((val) => VALID_INTEGRATION_TYPES.includes(val), {
			message: "O tipo de integração fornecido é inválido",
		})
		.transform((val) => val as IntegrationTypeEnum),

	roomId: z
		.string()
		.nullable()
		.optional()
		.transform((val) => (val && val.trim() !== "" ? val : null)),

	// Campos de configuração write-only (a leitura da API só devolve
	// ipAddress). Ficam opcionais aqui — a obrigatoriedade condicional por
	// integrationType é aplicada só no createDeviceSchema, via superRefine.
	macAddress: z
		.string()
		.trim()
		.optional()
		.transform((val) => (val && val !== "" ? val : undefined)),

	localKey: z
		.string()
		.trim()
		.optional()
		.transform((val) => (val && val !== "" ? val : undefined)),

	dpsPowerKey: z
		.string()
		.trim()
		.optional()
		.transform((val) => (val && val !== "" ? val : undefined)),

	clientKey: z
		.string()
		.trim()
		.optional()
		.transform((val) => (val && val !== "" ? val : undefined)),
});

/**
 * On create, enforce the network fields each integration type actually
 * needs to function (see INTEGRATION_FIELD_VISIBILITY). The backend itself
 * doesn't require these, so this is frontend-only UX guidance.
 */
export const createDeviceSchema = deviceBaseSchema.superRefine((data, ctx) => {
	const requiresIp =
		data.integrationType === IntegrationTypeEnum.TuyaBridge ||
		data.integrationType === IntegrationTypeEnum.LgWebOs ||
		data.integrationType === IntegrationTypeEnum.GoogleCast;

	if (requiresIp && !data.ipAddress) {
		ctx.addIssue({
			code: "custom",
			path: ["ipAddress"],
			message: "O endereço IP é obrigatório para este tipo de integração.",
		});
	}

	if (
		data.integrationType === IntegrationTypeEnum.TuyaBridge &&
		!data.localKey
	) {
		ctx.addIssue({
			code: "custom",
			path: ["localKey"],
			message: "A Local Key é obrigatória para integração via Tuya Bridge.",
		});
	}
});

// Na edição, campos em branco preservam o valor já salvo no backend
// (ver UpdateDeviceCommandHandler) — por isso nenhuma regra extra aqui.
export const updateDeviceSchema = deviceBaseSchema;

export type CreateDeviceFormInput = z.input<typeof createDeviceSchema>;
export type CreateDeviceFormOutput = z.output<typeof createDeviceSchema>;

export type UpdateDeviceFormInput = z.input<typeof updateDeviceSchema>;
export type UpdateDeviceFormOutput = z.output<typeof updateDeviceSchema>;
