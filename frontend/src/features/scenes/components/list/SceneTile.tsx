import { Loader2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { getSceneIcon } from "../../constants/scenes.constants";
import { formatLastActivation } from "../../lib/format-last-activation";
import { toWashItems } from "../../lib/scene-view";
import { buildSceneBackdrop } from "../../lib/scene-wash";
import type { Scene } from "../../types/scenes.types";
import { SceneMeta } from "./SceneMeta";

interface SceneTileProps {
	scene: Scene;
	isSelected: boolean;
	isActivating: boolean;
	offlineCount: number;
	onSelect: (sceneId: string) => void;
	onActivate: (scene: Scene) => void;
}

/**
 * Cartão de uma cena (visualização opcional "Cards"): o fundo é o light wash da cena.
 * Mesmo comportamento da linha: o cartão seleciona, o ▶ ativa.
 */
export function SceneTile({
	scene,
	isSelected,
	isActivating,
	offlineCount,
	onSelect,
	onActivate,
}: SceneTileProps) {
	const { t, i18n } = useTranslation("scenes");
	const Icon = getSceneIcon(scene.icon);
	const isEmpty = scene.items.length === 0;
	const backdrop = buildSceneBackdrop(toWashItems(scene));
	const lastActivation = formatLastActivation(
		scene.lastActivatedAt,
		i18n.language,
	);

	return (
		<li
			className={cn(
				"relative isolate flex min-h-36 flex-col justify-between gap-4 overflow-hidden rounded-xl border bg-surface-container p-4 transition-colors",
				isSelected
					? "border-primary"
					: "border-border-subtle hover:border-primary/40",
			)}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10"
				style={backdrop ? { backgroundImage: backdrop } : undefined}
			/>
			<button
				type="button"
				aria-label={t("row.select", { name: scene.name })}
				aria-current={isSelected}
				onClick={() => onSelect(scene.id)}
				className="absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			/>

			<div className="pointer-events-none flex items-start justify-between">
				<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high/80 text-foreground">
					<Icon className="h-4 w-4" />
				</span>
			</div>

			{!isEmpty && (
				<button
					type="button"
					aria-label={t("row.activate", { name: scene.name })}
					aria-busy={isActivating}
					disabled={isActivating}
					onClick={() => onActivate(scene)}
					className="absolute top-4 right-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress"
				>
					{isActivating ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Play className="h-3.5 w-3.5" />
					)}
				</button>
			)}

			<div className="pointer-events-none flex flex-col gap-1">
				<span className="truncate text-base font-medium text-foreground">
					{scene.name}
				</span>
				<SceneMeta scene={scene} offlineCount={offlineCount} />
				<span className="text-xs text-muted-foreground">
					{lastActivation
						? t("row.lastActivated", { when: lastActivation })
						: t("row.neverActivated")}
				</span>
			</div>
		</li>
	);
}
