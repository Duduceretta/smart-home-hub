import { create } from "zustand";
import {
	DEFAULT_THEME_CONTRAST,
	DEFAULT_THEME_PRESET,
	LEGACY_THEME_PRESET_MAP,
	type LegacyThemePresetId,
	THEME_CONTRAST_STORAGE_KEY,
	THEME_PRESET_OPTIONS,
	THEME_PRESET_STORAGE_KEY,
	type ThemeContrast,
	type ThemePresetId,
} from "../types/theme.types";

interface ThemeUIState {
	preset: ThemePresetId;
	setPreset: (preset: ThemePresetId) => void;
	contrast: ThemeContrast;
	setContrast: (contrast: ThemeContrast) => void;
}

function isValidPreset(value: string | null): value is ThemePresetId {
	return THEME_PRESET_OPTIONS.some((option) => option.id === value);
}

function isLegacyPreset(value: string | null): value is LegacyThemePresetId {
	return value !== null && value in LEGACY_THEME_PRESET_MAP;
}

/** Migra um ID salvo antes da renomeação M3 (P2) para o ID novo correspondente. */
function readStoredPreset(): ThemePresetId {
	try {
		const stored = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
		if (isValidPreset(stored)) return stored;
		if (isLegacyPreset(stored)) return LEGACY_THEME_PRESET_MAP[stored];
		return DEFAULT_THEME_PRESET;
	} catch {
		return DEFAULT_THEME_PRESET;
	}
}

/** Espelha o preset no atributo `data-theme` do `<html>`, lido de forma síncrona pelo script anti-FOUC do index.html. */
function applyPresetToDocument(preset: ThemePresetId) {
	if (preset === DEFAULT_THEME_PRESET) {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.setAttribute("data-theme", preset);
	}
}

function isValidContrast(value: string | null): value is ThemeContrast {
	return value === "standard" || value === "high";
}

/** Sem escolha salva, usa `prefers-contrast: more` do sistema operacional. */
function readStoredContrast(): ThemeContrast {
	try {
		const stored = localStorage.getItem(THEME_CONTRAST_STORAGE_KEY);
		if (isValidContrast(stored)) return stored;
		if (
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-contrast: more)").matches
		) {
			return "high";
		}
		return DEFAULT_THEME_CONTRAST;
	} catch {
		return DEFAULT_THEME_CONTRAST;
	}
}

/** Espelha o contraste no atributo `data-contrast` do `<html>` — mesmo mecanismo do preset. */
function applyContrastToDocument(contrast: ThemeContrast) {
	if (contrast === DEFAULT_THEME_CONTRAST) {
		document.documentElement.removeAttribute("data-contrast");
	} else {
		document.documentElement.setAttribute("data-contrast", contrast);
	}
}

const initialPreset = readStoredPreset();
const initialContrast = readStoredContrast();
if (typeof document !== "undefined") {
	applyPresetToDocument(initialPreset);
	applyContrastToDocument(initialContrast);
}

/**
 * Zustand store do preset de tema e do modo de contraste (dimensões
 * ortogonais entre si e ao modo claro/escuro). Persistência é manual
 * (string crua no localStorage) para casar com o script anti-FOUC de
 * `index.html`, que lê as mesmas chaves antes do React montar.
 */
export const useThemeUIStore = create<ThemeUIState>((set) => ({
	preset: initialPreset,
	setPreset: (preset) => {
		try {
			localStorage.setItem(THEME_PRESET_STORAGE_KEY, preset);
		} catch {
			// Armazenamento indisponível (ex: modo privado) — aplica só nesta sessão.
		}
		applyPresetToDocument(preset);
		set({ preset });
	},
	contrast: initialContrast,
	setContrast: (contrast) => {
		try {
			localStorage.setItem(THEME_CONTRAST_STORAGE_KEY, contrast);
		} catch {
			// Armazenamento indisponível (ex: modo privado) — aplica só nesta sessão.
		}
		applyContrastToDocument(contrast);
		set({ contrast });
	},
}));
