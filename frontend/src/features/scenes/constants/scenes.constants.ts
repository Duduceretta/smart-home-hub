import {
	BookOpen,
	Clapperboard,
	DoorOpen,
	Flame,
	LogOut,
	Moon,
	Music,
	PartyPopper,
	Sofa,
	Sparkles,
	Sun,
	Utensils,
} from "lucide-react";
import type { ComponentType } from "react";

export type SceneIconComponent = ComponentType<{ className?: string }>;

export interface SceneIconOption {
	id: string;
	/** Chave sob `icons` no namespace `scenes`. */
	labelKey: string;
	icon: SceneIconComponent;
}

/**
 * Ícones que identificam uma cena. O `id` é o que a API guarda em `icon`.
 */
export const SCENE_ICON_OPTIONS: SceneIconOption[] = [
	{ id: "clapperboard", labelKey: "icons.clapperboard", icon: Clapperboard },
	{ id: "sun", labelKey: "icons.sun", icon: Sun },
	{ id: "moon", labelKey: "icons.moon", icon: Moon },
	{ id: "door-open", labelKey: "icons.door-open", icon: DoorOpen },
	{ id: "log-out", labelKey: "icons.log-out", icon: LogOut },
	{ id: "sparkles", labelKey: "icons.sparkles", icon: Sparkles },
	{ id: "sofa", labelKey: "icons.sofa", icon: Sofa },
	{ id: "utensils", labelKey: "icons.utensils", icon: Utensils },
	{ id: "party-popper", labelKey: "icons.party-popper", icon: PartyPopper },
	{ id: "flame", labelKey: "icons.flame", icon: Flame },
	{ id: "music", labelKey: "icons.music", icon: Music },
	{ id: "book-open", labelKey: "icons.book-open", icon: BookOpen },
];

/** Ícone usado quando a cena não tem `icon` ou ele é desconhecido. */
export const DEFAULT_SCENE_ICON_ID = "sparkles";

export const SCENE_ICON_MAP: Record<string, SceneIconComponent> = {
	...Object.fromEntries(
		SCENE_ICON_OPTIONS.map((option) => [option.id, option.icon]),
	),
	default: Sparkles,
};

export function getSceneIcon(iconId: string | null | undefined) {
	return (iconId && SCENE_ICON_MAP[iconId]) || SCENE_ICON_MAP.default;
}

export interface SceneSuggestion {
	id: string;
	/** Chave sob `suggestions` no namespace `scenes`. */
	nameKey: string;
	/** Nome em pt-BR, usado como fallback do `t()`. */
	defaultName: string;
	icon: string;
	/**
	 * Mancha de luz do cartão de sugestão, só com tokens do tema (nunca cor
	 * fixa): cada sugestão ganha um clima próprio sem inventar token novo.
	 */
	wash: string;
}

/**
 * Sugestões do estado vazio. São pontos de partida que abrem o editor
 * pré-preenchido (nome e ícone) — não são cenas criadas nem dado falso.
 */
export const SCENE_SUGGESTIONS: SceneSuggestion[] = [
	{
		id: "good-morning",
		nameKey: "suggestions.goodMorning",
		defaultName: "Bom Dia",
		icon: "sun",
		wash: "radial-gradient(circle at 22% 8%, color-mix(in oklab, var(--warm) 58%, transparent) 0%, transparent 64%)",
	},
	{
		id: "arrive-home",
		nameKey: "suggestions.arriveHome",
		defaultName: "Chegar em Casa",
		icon: "door-open",
		wash: "radial-gradient(circle at 20% 12%, color-mix(in oklab, var(--warm) 46%, transparent) 0%, transparent 60%), radial-gradient(circle at 86% 88%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 62%)",
	},
	{
		id: "leave-home",
		nameKey: "suggestions.leaveHome",
		defaultName: "Sair de Casa",
		icon: "log-out",
		wash: "radial-gradient(circle at 80% 16%, color-mix(in oklab, var(--primary) 34%, transparent) 0%, transparent 62%)",
	},
	{
		id: "good-night",
		nameKey: "suggestions.goodNight",
		defaultName: "Boa Noite",
		icon: "moon",
		wash: "radial-gradient(circle at 78% 10%, color-mix(in oklab, var(--primary) 52%, transparent) 0%, transparent 66%)",
	},
];
