import { useTranslation } from "react-i18next";
import { getSceneIcon } from "../../constants/scenes.constants";
import { SCENE_PRESETS, type ScenePreset } from "../../lib/scene-presets";

interface ScenePresetsPanelProps {
	onApply: (preset: ScenePreset) => void;
}

/**
 * Predefinições da página de criação e edição, logo abaixo da prévia da cena. São
 * receitas por tipo de dispositivo: aplicar uma marca os dispositivos compatíveis
 * da casa do usuário e deixa tudo editável. Nada é salvo até ele confirmar.
 */
export function ScenePresetsPanel({ onApply }: ScenePresetsPanelProps) {
	const { t } = useTranslation("scenes");

	return (
		<section
			aria-label={t("presets.panelTitle")}
			className="rounded-xl border border-dashed border-border-subtle"
		>
			<header className="flex flex-col gap-1 border-b border-dashed border-border-subtle p-4">
				<h3 className="text-sm font-semibold text-foreground">
					{t("presets.panelTitle")}
				</h3>
				<p className="text-xs text-muted-foreground">
					{t("presets.panelHint")}
				</p>
			</header>

			<ul className="divide-y divide-dashed divide-border-subtle">
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
								onClick={() => onApply(preset)}
								className="h-8 cursor-pointer rounded-lg border border-border-subtle bg-surface-container px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								{t("presets.use")}
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
