import { create } from "zustand";
import type { Scene } from "../types/scenes.types";

/** Valores iniciais do editor ao partir de uma sugestão (nome e ícone). */
export interface SceneEditorSeed {
	name: string;
	icon: string;
}

interface ScenesUIState {
	isEditorOpen: boolean;
	/** Cena em edição; `null` no modo de criação. */
	editingScene: Scene | null;
	seed: SceneEditorSeed | null;
	openCreateEditor: (seed?: SceneEditorSeed) => void;
	openEditEditor: (scene: Scene) => void;
	closeEditor: () => void;
}

/**
 * Estado efêmero de UI da feature de cenas (visibilidade do editor). Nenhuma
 * requisição aqui: dados de servidor vivem no TanStack Query.
 */
export const useScenesUIStore = create<ScenesUIState>((set) => ({
	isEditorOpen: false,
	editingScene: null,
	seed: null,
	openCreateEditor: (seed) =>
		set({ isEditorOpen: true, editingScene: null, seed: seed ?? null }),
	openEditEditor: (scene) =>
		set({ isEditorOpen: true, editingScene: scene, seed: null }),
	closeEditor: () =>
		set({ isEditorOpen: false, editingScene: null, seed: null }),
}));
