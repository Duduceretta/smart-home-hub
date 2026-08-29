export type ThemePresetId =
	| "zinc-minimalist"
	| "indigo"
	| "slate-cyan"
	| "github-dimmed"
	| "contrast-safe-graphite";

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
		id: "zinc-minimalist",
		label: "Zinc Minimalist",
		swatch: { background: "#09090b", card: "#18181b", primary: "#fafafa" },
	},
	{
		id: "indigo",
		label: "Indigo",
		swatch: { background: "#08090d", card: "#151824", primary: "#5e6ad2" },
	},
	{
		id: "slate-cyan",
		label: "Slate & Cyan",
		swatch: { background: "#0b0f17", card: "#172033", primary: "#06b6d4" },
	},
	{
		id: "github-dimmed",
		label: "GitHub Dimmed",
		swatch: { background: "#0d1117", card: "#21262d", primary: "#2f81f7" },
	},
	{
		id: "contrast-safe-graphite",
		label: "Contrast Safe Graphite",
		swatch: { background: "#09090b", card: "#414141", primary: "#5e6ad2" },
	},
];

export const DEFAULT_THEME_PRESET: ThemePresetId = "zinc-minimalist";

export const THEME_PRESET_STORAGE_KEY = "app-theme-preset";
