import { create } from "zustand";

export type ScenesViewMode = "list" | "cards";

interface ScenesUIState {
	/** Lista é o padrão; cards são uma opção de visualização. */
	viewMode: ScenesViewMode;
	setViewMode: (mode: ScenesViewMode) => void;
}

/**
 * Estado efêmero de UI da feature de cenas. Criar e editar são páginas (rotas
 * `/scenes/new` e `/scenes/:id/edit`) e a cena selecionada vive na URL (`?scene=`),
 * então aqui sobra só a preferência de visualização. Nenhuma requisição: dados de
 * servidor vivem no TanStack Query.
 */
export const useScenesUIStore = create<ScenesUIState>((set) => ({
	viewMode: "list",
	setViewMode: (viewMode) => set({ viewMode }),
}));
