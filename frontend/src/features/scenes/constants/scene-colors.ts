export interface SceneColorPreset {
	id: string;
	/** Chave sob `editor.colors` no namespace `scenes`. */
	labelKey: string;
	hex: string;
}

/**
 * Cores de luz oferecidas no editor. São DADO que vai para o dispositivo
 * (`colorHex`), não tokens de design — por isso hex literal aqui é legítimo.
 */
export const SCENE_COLOR_PRESETS: SceneColorPreset[] = [
	{ id: "amber", labelKey: "editor.colors.amber", hex: "#FFAA33" }, // design-token-lint-ignore
	{ id: "red", labelKey: "editor.colors.red", hex: "#FF3B30" }, // design-token-lint-ignore
	{ id: "green", labelKey: "editor.colors.green", hex: "#34C759" }, // design-token-lint-ignore
	{ id: "blue", labelKey: "editor.colors.blue", hex: "#0A84FF" }, // design-token-lint-ignore
	{ id: "purple", labelKey: "editor.colors.purple", hex: "#BF5AF2" }, // design-token-lint-ignore
	{ id: "pink", labelKey: "editor.colors.pink", hex: "#FF2D92" }, // design-token-lint-ignore
	{ id: "cyan", labelKey: "editor.colors.cyan", hex: "#32D4DE" }, // design-token-lint-ignore
	{ id: "white", labelKey: "editor.colors.white", hex: "#FFFFFF" }, // design-token-lint-ignore
];
