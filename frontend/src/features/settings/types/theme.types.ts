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
	/** Prévia de 3 cores do preset: fundo, card e cor de destaque (primary). */
	swatch: {
		background: string;
		card: string;
		primary: string;
	};
}

export const THEME_PRESET_OPTIONS: ThemePresetOption[] = [
	{
		id: "teal",
		label: "Verde Nexus",
		// design-token-lint-ignore: prévia fixa do preset, não segue o tema ativo
		swatch: { background: "#0f1512", card: "#1b211e", primary: "#5ce4b1" },
	},
	{
		id: "indigo",
		label: "Índigo",
		// design-token-lint-ignore: prévia fixa do preset, não segue o tema ativo
		swatch: { background: "#131318", card: "#1f1e24", primary: "#c4bfff" },
	},
	{
		id: "cyan",
		label: "Ciano",
		// design-token-lint-ignore: prévia fixa do preset, não segue o tema ativo
		swatch: { background: "#0e1515", card: "#1a2021", primary: "#51deec" },
	},
	{
		id: "blue",
		label: "Azul",
		// design-token-lint-ignore: prévia fixa do preset, não segue o tema ativo
		swatch: { background: "#101418", card: "#1b1f24", primary: "#9acdff" },
	},
	{
		id: "orchid",
		label: "Orquídea",
		// design-token-lint-ignore: prévia fixa do preset, não segue o tema ativo
		swatch: { background: "#161215", card: "#221d21", primary: "#f4abec" },
	},
];

export const DEFAULT_THEME_PRESET: ThemePresetId = "teal";

export const THEME_PRESET_STORAGE_KEY = "app-theme-preset";
