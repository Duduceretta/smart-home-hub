export type ThemePresetId = "teal" | "indigo" | "cyan" | "blue" | "orchid";

/** IDs antigos (pré-migração M3), aceitos por `readStoredPreset` para não quebrar quem já tinha um preset salvo. */
export type LegacyThemePresetId =
	| "zinc-minimalist"
	| "slate-cyan"
	| "github-dimmed"
	| "contrast-safe-graphite";

export const LEGACY_THEME_PRESET_MAP: Record<
	LegacyThemePresetId,
	ThemePresetId
> = {
	"zinc-minimalist": "teal",
	"slate-cyan": "cyan",
	"github-dimmed": "blue",
	"contrast-safe-graphite": "orchid",
};

export interface ThemePresetOption {
	id: ThemePresetId;
	label: string;
	/**
	 * Prévia do preset: fundo/card fiéis à superfície real (`surface`/
	 * `surface-container`), e as 3 cores do "scheme swatch" M3 (padrão
	 * Android 12+ "Wallpaper & style"): primary, secondary, tertiary.
	 */
	swatch: {
		background: string;
		card: string;
		primary: string;
		secondary: string;
		tertiary: string;
	};
}

export const THEME_PRESET_OPTIONS: ThemePresetOption[] = [
	{
		id: "teal",
		label: "Verde Nexus",
		swatch: {
			background: "#0f1512", // design-token-lint-ignore: prévia fixa, não segue o tema ativo
			card: "#1b211e", // design-token-lint-ignore
			primary: "#5ce4b1", // design-token-lint-ignore
			secondary: "#acd1c0", // design-token-lint-ignore
			tertiary: "#96d2ea", // design-token-lint-ignore
		},
	},
	{
		id: "indigo",
		label: "Índigo",
		swatch: {
			background: "#131318", // design-token-lint-ignore: prévia fixa, não segue o tema ativo
			card: "#1f1e24", // design-token-lint-ignore
			primary: "#c4bfff", // design-token-lint-ignore
			secondary: "#c5c3e3", // design-token-lint-ignore
			tertiary: "#e9b6cf", // design-token-lint-ignore
		},
	},
	{
		id: "cyan",
		label: "Ciano",
		swatch: {
			background: "#0e1515", // design-token-lint-ignore: prévia fixa, não segue o tema ativo
			card: "#1a2021", // design-token-lint-ignore
			primary: "#51deec", // design-token-lint-ignore
			secondary: "#aacfd4", // design-token-lint-ignore
			tertiary: "#b4c7ef", // design-token-lint-ignore
		},
	},
	{
		id: "blue",
		label: "Azul",
		swatch: {
			background: "#101418", // design-token-lint-ignore: prévia fixa, não segue o tema ativo
			card: "#1b1f24", // design-token-lint-ignore
			primary: "#9acdff", // design-token-lint-ignore
			secondary: "#b4cae1", // design-token-lint-ignore
			tertiary: "#d3bde6", // design-token-lint-ignore
		},
	},
	{
		id: "orchid",
		label: "Orquídea",
		swatch: {
			background: "#161215", // design-token-lint-ignore: prévia fixa, não segue o tema ativo
			card: "#221d21", // design-token-lint-ignore
			primary: "#f4abec", // design-token-lint-ignore
			secondary: "#d7bed4", // design-token-lint-ignore
			tertiary: "#ecb9b0", // design-token-lint-ignore
		},
	},
];

export const DEFAULT_THEME_PRESET: ThemePresetId = "teal";

export const THEME_PRESET_STORAGE_KEY = "app-theme-preset";

/**
 * Modo de contraste — ortogonal ao preset (`data-contrast` no `<html>`,
 * combinável com qualquer um dos 5 presets). Mesmas hues, só tons/bordas mudam.
 */
export type ThemeContrast = "standard" | "high";

export const DEFAULT_THEME_CONTRAST: ThemeContrast = "standard";

export const THEME_CONTRAST_STORAGE_KEY = "app-theme-contrast";
