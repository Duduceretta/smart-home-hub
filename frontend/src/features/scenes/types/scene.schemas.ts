import { z } from "zod";

/**
 * Item de cena no formulário, espelhando as regras do `SceneItemInputValidator`
 * do backend. `null` em um atributo significa "a cena não mexe nele".
 */
export const sceneItemSchema = z.object({
	deviceId: z.string().min(1),
	isOn: z.boolean(),
	brightness: z
		.number()
		.int()
		.min(0, "O brilho deve estar entre 0 e 100.")
		.max(100, "O brilho deve estar entre 0 e 100.")
		.nullable(),
	colorHex: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar no formato #RRGGBB.")
		.nullable(),
	colorTempPercent: z
		.number()
		.int()
		.min(0, "A temperatura de cor deve estar entre 0 e 100.")
		.max(100, "A temperatura de cor deve estar entre 0 e 100.")
		.nullable(),
});

/**
 * Schema do formulário de cena. `items` com min(1): o backend recusa cena sem
 * dispositivo, e uma cena vazia não tem o que ativar.
 */
export const sceneFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "O nome da cena é obrigatório.")
		.max(100, "O nome da cena deve ter no máximo 100 caracteres."),
	icon: z
		.string()
		.trim()
		.max(50, "O nome do ícone deve ter no máximo 50 caracteres.")
		.optional()
		.or(z.literal("")),
	items: z
		.array(sceneItemSchema)
		.min(1, "Selecione ao menos um dispositivo para a cena."),
});

export type SceneFormItem = z.infer<typeof sceneItemSchema>;
export type SceneFormInput = z.input<typeof sceneFormSchema>;
export type SceneFormOutput = z.output<typeof sceneFormSchema>;
