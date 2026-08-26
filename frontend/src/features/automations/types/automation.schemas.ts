import { z } from "zod";

/**
 * Checagem leve de formato (5 campos separados por espaço) — não é um
 * parser de cron completo. A autoridade final é o backend (Cronos), que
 * responde 400 se a expressão for sintaticamente inválida.
 */
const CRON_FORMAT_REGEX = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/;

const GUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CONDITION_PROPERTIES = [
	"isOn",
	"temperature",
	"powerUsageWatts",
	"deviceId",
] as const;

export const CONDITION_COMPARISONS = [
	"==",
	"!=",
	">",
	">=",
	"<",
	"<=",
] as const;

/**
 * `value` fica sempre como string dentro do form (inputs/selects do RHF
 * devolvem string) — o significado real depende de `property` e só é
 * validado/convertido aqui e na hora de montar o AutomationPayload no submit.
 */
const conditionRuleSchema = z
	.object({
		deviceId: z
			.string()
			.trim()
			.regex(GUID_REGEX, "Selecione um dispositivo válido."),
		property: z.enum(CONDITION_PROPERTIES),
		comparison: z.enum(CONDITION_COMPARISONS),
		value: z.string().trim().min(1, "Informe um valor para a condição."),
	})
	.superRefine((rule, ctx) => {
		if (rule.property === "isOn") {
			if (rule.value !== "true" && rule.value !== "false") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["value"],
					message: "Selecione Ligado ou Desligado.",
				});
			}
			return;
		}

		if (
			rule.property === "temperature" ||
			rule.property === "powerUsageWatts"
		) {
			if (Number.isNaN(Number(rule.value))) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["value"],
					message: "Informe um número válido.",
				});
			}
			return;
		}

		if (rule.property === "deviceId" && !GUID_REGEX.test(rule.value)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["value"],
				message: "Selecione um dispositivo válido.",
			});
		}
	});

const timeTriggerSchema = z.object({
	cron: z
		.string()
		.trim()
		.min(1, "Informe a expressão cron.")
		.regex(
			CRON_FORMAT_REGEX,
			"Formato de cron inválido (esperado: 5 campos separados por espaço, ex: 0 22 * * *).",
		),
});

const deviceStateTriggerSchema = z.object({
	triggerDeviceId: z
		.string()
		.trim()
		.regex(GUID_REGEX, "Selecione um dispositivo válido."),
	triggerStateType: z
		.string()
		.trim()
		.min(1, "Informe o tipo de estado observado."),
});

/**
 * Schema base do form — usado por Create e Update. `rules` fica sempre como
 * array (nunca null): o mapeamento pra `conditions: null` acontece só na
 * fronteira com a API (montagem do AutomationPayload no onSubmit).
 */
export const automationFormSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "O nome da automação é obrigatório.")
			.max(150, "O nome da automação não pode passar de 150 caracteres."),
		isActive: z.boolean(),
		triggerType: z.enum(["time", "device_state"]),
		cron: z.string().trim().optional().default(""),
		triggerDeviceId: z.string().trim().optional().default(""),
		triggerStateType: z.string().trim().optional().default(""),
		conditionOperator: z.enum(["AND", "OR"]),
		rules: z.array(conditionRuleSchema),
		actions: z
			.array(
				z.object({
					deviceId: z
						.string()
						.trim()
						.regex(GUID_REGEX, "Selecione um dispositivo válido."),
					desiredState: z.enum(["true", "false"]),
				}),
			)
			.min(1, "Adicione pelo menos uma ação."),
	})
	.superRefine((form, ctx) => {
		if (form.triggerType === "time") {
			const result = timeTriggerSchema.safeParse({ cron: form.cron });
			if (!result.success) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["cron"],
					message: result.error.issues[0]?.message ?? "Cron inválido.",
				});
			}
			return;
		}

		const result = deviceStateTriggerSchema.safeParse({
			triggerDeviceId: form.triggerDeviceId,
			triggerStateType: form.triggerStateType,
		});
		if (!result.success) {
			for (const issue of result.error.issues) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: issue.path,
					message: issue.message,
				});
			}
		}
	});

export const createAutomationSchema = automationFormSchema;
export const updateAutomationSchema = automationFormSchema;

export type AutomationFormInput = z.input<typeof automationFormSchema>;
export type AutomationFormOutput = z.output<typeof automationFormSchema>;
export type ConditionRuleFormValue = z.output<typeof conditionRuleSchema>;
