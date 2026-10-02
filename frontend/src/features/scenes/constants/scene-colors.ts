/**
 * Cores de luz usadas pelo editor e pelas predefinições. São DADO que vai para o
 * dispositivo (`colorHex`), não tokens de design — por isso hex literal aqui é legítimo.
 */
export const COLOR_AMBER = "#FFAA33"; // design-token-lint-ignore
export const COLOR_WARM_WHITE = "#FFD9A8"; // design-token-lint-ignore
export const COLOR_WHITE = "#FFFFFF"; // design-token-lint-ignore
export const COLOR_COOL_WHITE = "#DDEBFF"; // design-token-lint-ignore
export const COLOR_BLUE = "#0A84FF"; // design-token-lint-ignore
export const COLOR_PURPLE = "#BF5AF2"; // design-token-lint-ignore
export const COLOR_PINK = "#FF2D92"; // design-token-lint-ignore
export const COLOR_GREEN = "#34C759"; // design-token-lint-ignore
export const COLOR_RED = "#FF3B30"; // design-token-lint-ignore
export const COLOR_CYAN = "#32D4DE"; // design-token-lint-ignore

export interface SceneColorPreset {
	id: string;
	/** Chave sob `editor.colors` no namespace `scenes`. */
	labelKey: string;
	hex: string;
}

/** Cores oferecidas no seletor do editor, das mais usadas em iluminação para as vivas. */
export const SCENE_COLOR_PRESETS: SceneColorPreset[] = [
	{ id: "amber", labelKey: "editor.colors.amber", hex: COLOR_AMBER },
	{
		id: "warm-white",
		labelKey: "editor.colors.warmWhite",
		hex: COLOR_WARM_WHITE,
	},
	{ id: "white", labelKey: "editor.colors.white", hex: COLOR_WHITE },
	{
		id: "cool-white",
		labelKey: "editor.colors.coolWhite",
		hex: COLOR_COOL_WHITE,
	},
	{ id: "blue", labelKey: "editor.colors.blue", hex: COLOR_BLUE },
	{ id: "purple", labelKey: "editor.colors.purple", hex: COLOR_PURPLE },
	{ id: "pink", labelKey: "editor.colors.pink", hex: COLOR_PINK },
	{ id: "green", labelKey: "editor.colors.green", hex: COLOR_GREEN },
	{ id: "red", labelKey: "editor.colors.red", hex: COLOR_RED },
	{ id: "cyan", labelKey: "editor.colors.cyan", hex: COLOR_CYAN },
];
