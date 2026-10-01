import { Loader2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { getSceneIcon } from "../../constants/scenes.constants";
import { formatLastActivation } from "../../lib/format-last-activation";
import { toWashItems } from "../../lib/scene-view";
import { buildSceneStrip } from "../../lib/scene-wash";
import type { Scene } from "../../types/scenes.types";
import { SceneMeta } from "./SceneMeta";

interface SceneRowProps {
	scene: Scene;
	isSelected: boolean;
	isActivating: boolean;
	offlineCount: number;
	onSelect: (sceneId: string) => void;
	onActivate: (scene: Scene) => void;
}

/**
 * Linha de uma cena na lista: ▶ (aparece no hover e na linha selecionada), ícone, nome,
 * a "faixa de luz" com as cores que a cena acende e a última ativação. A linha inteira
 * seleciona a cena (abre a edição rápida); o ▶ ativa. Cena sem dispositivos não ativa.
 */
export function SceneRow({
	scene,
	isSelected,
	isActivating,
	offlineCount,
	onSelect,
	onActivate,
}: SceneRowProps) {
	const { t, i18n } = useTranslation("scenes");
	const Icon = getSceneIcon(scene.icon);
	const isEmpty = scene.items.length === 0;
	const strip = buildSceneStrip(toWashItems(scene));
	const lastActivation = formatLastActivation(
		scene.lastActivatedAt,
		i18n.language,
	);

	return (
		<li
			className={cn(
				"group relative grid grid-cols-[2rem_2rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-l-2 px-4 py-3 transition-colors md:grid-cols-[2rem_2rem_minmax(8rem,12.5rem)_minmax(3rem,1fr)_7rem]",
				isSelected
					? "border-primary bg-surface-high"
					: "border-transparent hover:bg-surface-high",
			)}
		>
			<button
				type="button"
				aria-label={t("row.select", { name: scene.name })}
				aria-current={isSelected}
				onClick={() => onSelect(scene.id)}
				className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
			/>

			<div className="relative z-10 flex h-8 w-8 items-center justify-center">
				{!isEmpty && (
					<button
						type="button"
						aria-label={t("row.activate", { name: scene.name })}
						aria-busy={isActivating}
						disabled={isActivating}
						onClick={() => onActivate(scene)}
						className={cn(
							"flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress",
							isSelected || isActivating
								? "opacity-100"
								: "opacity-0 group-hover:opacity-100",
						)}
					>
						{isActivating ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Play className="h-3.5 w-3.5" />
						)}
					</button>
				)}
			</div>

			<span className="pointer-events-none flex h-8 w-8 items-center justify-center rounded-lg bg-surface-low text-foreground">
				<Icon className="h-4 w-4" />
			</span>

			<div className="pointer-events-none flex min-w-0 flex-col gap-1">
				<span className="truncate text-sm font-medium text-foreground">
					{scene.name}
				</span>
				<SceneMeta scene={scene} offlineCount={offlineCount} />
			</div>

			<div
				aria-hidden
				className={cn(
					"pointer-events-none col-span-full h-2 rounded-full md:col-span-1",
					strip ? "" : "border border-dashed border-border-subtle",
				)}
				style={strip ? { backgroundImage: strip } : undefined}
			/>

			<span className="pointer-events-none hidden text-right text-xs text-muted-foreground md:block">
				{lastActivation
					? t("row.lastActivated", { when: lastActivation })
					: t("row.neverActivated")}
			</span>
		</li>
	);
}
