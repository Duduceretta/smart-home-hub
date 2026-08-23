import { z } from "zod";

/**
 * Schema for the manual telemetry emission form.
 */
export const emitTelemetrySchema = z.object({
	deviceId: z.string().min(1, "Selecione um dispositivo."),
	isOn: z.boolean(),
	powerUsageWatts: z.coerce.number().min(0).optional(),
	temperatureCelsius: z.coerce.number().optional(),
});

export type EmitTelemetryFormInput = z.input<typeof emitTelemetrySchema>;
export type EmitTelemetryFormOutput = z.output<typeof emitTelemetrySchema>;

/**
 * Schema for the connectivity toggle form.
 */
export const toggleConnectivitySchema = z.object({
	deviceId: z.string().min(1, "Selecione um dispositivo."),
});

export type ToggleConnectivityFormInput = z.input<
	typeof toggleConnectivitySchema
>;
export type ToggleConnectivityFormOutput = z.output<
	typeof toggleConnectivitySchema
>;
