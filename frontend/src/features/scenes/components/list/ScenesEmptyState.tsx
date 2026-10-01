import { useTranslation } from "react-i18next";
import { getSceneIcon } from "../../constants/scenes.constants";
import { SCENE_PRESETS, type ScenePreset } from "../../lib/scene-presets";

interface ScenesEmptyStateProps {
	onUsePreset: (preset: ScenePreset) => void;
	onStartFromScratch: () => void;
}

/**
 * Estado vazio da tela de Cenas: em vez de uma tela em branco com um botão, as
 * predefinições viram o ponto de partida. Escolher uma abre a página de criação já com
 * os dispositivos compatíveis marcados; nada é salvo até o usuário confirmar.
 */
export function ScenesEmptyState({
	onUsePreset,
	onStartFromScratch,
}: ScenesEmptyStateProps) {
	const { t } = useTranslation("scenes");

	return (
		<section className="flex max-w-3xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h2 className="text-2xl font-semibold tracking-tight text-foreground">
					{t("empty.title")}
				</h2>
				<p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
			</div>

			<ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-container">
				{SCENE_PRESETS.map((preset) => {
					const Icon = getSceneIcon(preset.icon);
					const name = t(preset.nameKey, preset.defaultName);

					return (
						<li
							key={preset.id}
							className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-4 p-4"
						>
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high text-foreground">
								<Icon className="h-4 w-4" />
							</span>
							<div className="flex min-w-0 flex-col">
								<span className="truncate text-sm font-medium text-foreground">
									{name}
								</span>
								<span className="text-xs text-muted-foreground">
									{t(preset.descriptionKey, preset.defaultDescription)}
								</span>
							</div>
							<button
								type="button"
								aria-label={t("presets.useLabel", { name })}
								onClick={() => onUsePreset(preset)}
								className="h-8 cursor-pointer rounded-lg border border-border-subtle bg-surface-low px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								{t("presets.use")}
							</button>
						</li>
					);
				})}
			</ul>

			<div>
				<button
					type="button"
					onClick={onStartFromScratch}
					className="h-8 cursor-pointer rounded-lg border border-border-subtle bg-surface-container px-4 text-sm font-medium text-foreground outline-none transition-colors hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-ring/50"
				>
					{t("empty.scratch")}
				</button>
			</div>
		</section>
	);
}
