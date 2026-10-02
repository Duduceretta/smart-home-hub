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
