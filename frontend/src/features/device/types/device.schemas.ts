import { z } from "zod";
import { DeviceTypeEnum } from "../types/devices.types";

export const createDeviceSchema = z.object({
    name: z
        .string()
        .min(2, "O nome deve ter pelo menos 2 caracteres")
        .max(50, "Máximo de 50 caracteres"),
    brand: z
        .string()
        .min(2, "A marca é obrigatória")
        .max(50, "Máximo de 50 caracteres"),
    externalId: z
        .string()
        .min(3, "Identificador/MAC inválido")
        .regex(
            /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[A-Za-z0-9-_]+$/,
            "Digite um MAC ou ID válido",
        ),
    type: z.coerce
        .number()
        .refine(
            (val) =>
                Object.values(DeviceTypeEnum).includes(val as DeviceTypeEnum),
            {
                message: "Selecione um tipo de dispositivo válido",
            },
        ),
    // Garantimos que a entrada aceita string ou null/undefined e sai como string | null
    roomId: z
        .string()
        .nullable()
        .optional()
        .transform((val) => (val && val.trim() !== "" ? val : null)),
});

export type CreateDeviceFormInput = z.input<typeof createDeviceSchema>;

export type CreateDeviceFormOutput = z.output<typeof createDeviceSchema>;