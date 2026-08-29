import { create } from "zustand";
import {
	DEFAULT_THEME_PRESET,
	THEME_PRESET_OPTIONS,
	THEME_PRESET_STORAGE_KEY,
	type ThemePresetId,
} from "../types/theme.types";

interface ThemeUIState {
	preset: ThemePresetId;
	setPreset: (preset: ThemePresetId) => void;
}

function isValidPreset(value: string | null): value is ThemePresetId {
	return THEME_PRESET_OPTIONS.some((option) => option.id === value);
}

function readStoredPreset(): ThemePresetId {
	try {
		const stored = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
		return isValidPreset(stored) ? stored : DEFAULT_THEME_PRESET;
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

const initialPreset = readStoredPreset();
if (typeof document !== "undefined") {
	applyPresetToDocument(initialPreset);
}

/**
 * Zustand store do preset de tema (dimensão adicional ao modo claro/escuro).
 * Persistência é manual (string crua no localStorage) para casar com o
 * script anti-FOUC de `index.html`, que lê a mesma chave antes do React montar.
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
}));
