import { Loader2, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
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
	onEdit: (scene: Scene) => void;
	onDelete: (scene: Scene) => void;
}

const ICON_BUTTON_CLASSNAME =
	"flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-surface-highest hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress";

/**
 * Linha de uma cena na lista: um cartão com ícone, nome e metadados, a "faixa de luz" com
 * as cores que a cena acende, a última ativação e, à direita, ▶ (ativa) e o menu de três
 * pontos (editar e excluir). A linha inteira seleciona a cena (abre a edição rápida).
 * Cena sem dispositivos não ativa.
 */
export function SceneRow({
	scene,
	isSelected,
	isActivating,
	offlineCount,
	onSelect,
	onActivate,
	onEdit,
	onDelete,
}: SceneRowProps) {
	const { t, i18n } = useTranslation(["scenes", "common"]);
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
				"relative flex items-center gap-4 rounded-xl border border-l-2 bg-surface-container p-4 transition-colors hover:bg-surface-high",
				isSelected
					? "border-y-border-subtle border-r-border-subtle border-l-primary/60"
					: "border-border-subtle",
			)}
		>
			<button
				type="button"
				aria-label={t("row.select", { name: scene.name })}
				aria-current={isSelected}
				onClick={() => onSelect(scene.id)}
				className="absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			/>

			<span className="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-high text-foreground">
				<Icon className="h-5 w-5" />
			</span>

			<div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
				<span className="truncate text-sm font-medium text-foreground">
					{scene.name}
				</span>
				<SceneMeta scene={scene} offlineCount={offlineCount} />
			</div>

			<div
				aria-hidden
				className={cn(
					"pointer-events-none hidden h-2 w-40 shrink-0 rounded-full md:block",
					strip ? "" : "border border-dashed border-border-subtle",
				)}
				style={strip ? { backgroundImage: strip } : undefined}
			/>

			<span className="pointer-events-none hidden w-32 shrink-0 text-right text-xs text-muted-foreground md:block">
				{lastActivation
					? t("row.lastActivated", { when: lastActivation })
					: t("row.neverActivated")}
			</span>

			<div className="relative z-10 flex shrink-0 items-center gap-1">
				{!isEmpty && (
					<button
						type="button"
						aria-label={t("row.activate", { name: scene.name })}
						aria-busy={isActivating}
						disabled={isActivating}
						onClick={() => onActivate(scene)}
						className={ICON_BUTTON_CLASSNAME}
					>
						{isActivating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Play className="h-4 w-4" />
						)}
					</button>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t("row.moreOptions", { name: scene.name })}
							className={ICON_BUTTON_CLASSNAME}
						>
							<MoreVertical className="h-4 w-4" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="w-36 border-border-subtle bg-surface-container text-foreground shadow-xl z-50"
					>
						<DropdownMenuItem
							onClick={() => onEdit(scene)}
							className="cursor-pointer gap-2 text-xs text-muted-foreground focus:bg-surface-highest focus:text-foreground"
						>
							<Pencil className="h-3.5 w-3.5" />
							<span>{t("common:actions.edit")}</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(scene)}
							className="cursor-pointer gap-2 text-xs text-alert-foreground focus:bg-alert/20 focus:text-alert-foreground"
						>
							<Trash2 className="h-3.5 w-3.5" />
							<span>{t("common:actions.delete")}</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</li>
	);
}
