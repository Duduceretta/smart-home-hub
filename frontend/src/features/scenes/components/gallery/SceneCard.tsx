import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { buildSceneBackdrop, sceneItemTone } from "../../lib/scene-wash";
import type { Scene } from "../../types/scenes.types";

/** Pontinhos de estado por card: acima disso vira "+N" para o rodapé não quebrar. */
const MAX_STATE_DOTS = 6;

interface SceneCardProps {
	scene: Scene;
	isActivating: boolean;
	onActivate: (scene: Scene) => void;
	onEdit: (scene: Scene) => void;
	onDelete: (scene: Scene) => void;
}

/**
 * Cartão de uma cena. A superfície inteira é o botão de ativar (1 toque = a
 * razão de existir de uma cena); editar e excluir ficam no menu. O fundo é o
 * "light wash": manchas de luz derivadas das cores que a própria cena acende.
 * Cena sem dispositivos não ativa — o cartão vira um convite a adicionar.
 */
export function SceneCard({
	scene,
	isActivating,
	onActivate,
	onEdit,
	onDelete,
}: SceneCardProps) {
	const { t, i18n } = useTranslation("scenes");

	const Icon = getSceneIcon(scene.icon);
	const isEmpty = scene.items.length === 0;
	const wash = buildSceneBackdrop(scene.items);
	const turnsOn = scene.items.filter((item) => item.isOn).length;
	const turnsOff = scene.items.length - turnsOn;
	const lastActivation = formatLastActivation(
		scene.lastActivatedAt,
		i18n.language,
	);
	const visibleItems = scene.items.slice(0, MAX_STATE_DOTS);
	const hiddenCount = scene.items.length - visibleItems.length;

	return (
		<article
			className={cn(
				"group relative isolate flex min-h-56 flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border-subtle bg-surface-container p-4 transition-[border-color,transform] duration-200",
				"motion-safe:active:scale-[0.99]",
				isEmpty ? "border-dashed" : "hover:border-primary/40",
			)}
		>
			{/* Light wash — decorativo, só opacity muda no hover. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
				style={wash ? { backgroundImage: wash } : undefined}
			/>

			{!isEmpty && (
				<button
					type="button"
					aria-label={t("card.activate", { name: scene.name })}
					aria-busy={isActivating}
					disabled={isActivating}
					onClick={() => onActivate(scene)}
					className="absolute inset-0 z-10 cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress"
				/>
			)}

			<div className="pointer-events-none flex items-start justify-between">
				<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high/80 text-foreground ring-1 ring-border-subtle">
					{isActivating ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<Icon className="h-5 w-5" />
					)}
				</span>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={t("card.menu", { name: scene.name })}
						className="absolute top-4 right-4 z-20 cursor-pointer rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-surface-highest hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<MoreVertical className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="z-50 w-40 border-border-subtle bg-surface-container text-foreground shadow-xl"
				>
					<DropdownMenuItem
						onClick={() => onEdit(scene)}
						className="cursor-pointer gap-2 text-xs text-muted-foreground focus:bg-surface-highest focus:text-foreground"
					>
						<Pencil className="h-3.5 w-3.5" />
						<span>{t("card.edit")}</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => onDelete(scene)}
						className="cursor-pointer gap-2 text-xs text-alert-foreground focus:bg-alert/20 focus:text-alert-foreground"
					>
						<Trash2 className="h-3.5 w-3.5" />
						<span>{t("card.delete")}</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="pointer-events-none flex flex-col gap-2">
				<h3 className="truncate text-xl font-medium tracking-tight text-foreground">
					{scene.name}
				</h3>

				{isEmpty ? (
					<div className="flex flex-col items-start gap-2">
						<span className="rounded-full bg-alert/15 px-2 py-1 text-xs font-medium uppercase tracking-wider text-alert-foreground">
							{t("card.empty")}
						</span>
						<p className="text-sm text-muted-foreground">
							{t("card.emptyHint")}
						</p>
						<button
							type="button"
							onClick={() => onEdit(scene)}
							className="pointer-events-auto relative z-20 h-8 cursor-pointer rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							{t("card.emptyAction")}
						</button>
					</div>
				) : (
					<>
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
							<span>
								{t("card.deviceCount", { count: scene.items.length })}
							</span>
							<span aria-hidden>·</span>
							<span>
								{turnsOn > 0
									? t("card.turnsOn", { count: turnsOn })
									: t("card.turnsOff", { count: turnsOff })}
							</span>
						</div>

						<div className="flex items-center justify-between gap-2">
							<span className="truncate text-xs text-muted-foreground">
								{lastActivation
									? t("card.lastActivated", { when: lastActivation })
									: t("card.neverActivated")}
							</span>
							<span className="flex items-center gap-1" aria-hidden>
								{visibleItems.map((item) => {
									const tone = sceneItemTone(item);

									return (
										<span
											key={item.deviceId}
											className={cn(
												"h-2 w-2 rounded-full border",
												tone
													? "border-transparent"
													: "border-muted-foreground/60",
											)}
											style={tone ? { backgroundColor: tone } : undefined}
										/>
									);
								})}
								{hiddenCount > 0 && (
									<span className="text-xs text-muted-foreground">
										+{hiddenCount}
									</span>
								)}
							</span>
						</div>
					</>
				)}
			</div>
		</article>
	);
}
