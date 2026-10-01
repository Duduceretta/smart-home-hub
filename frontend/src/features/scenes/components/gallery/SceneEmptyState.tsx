import { useTranslation } from "react-i18next";
import {
	getSceneIcon,
	SCENE_SUGGESTIONS,
} from "../../constants/scenes.constants";
import type { SceneEditorSeed } from "../../store/scenes-ui.store";

interface SceneEmptyStateProps {
	onStartFromSuggestion: (seed: SceneEditorSeed) => void;
	onStartFromScratch: () => void;
}

/**
 * Estado vazio da galeria: em vez de uma tela em branco com botão, oferece quatro
 * pontos de partida no mesmo formato dos cartões de cena. A sugestão só abre o editor
 * pré-preenchido (nome e ícone) — nada é criado até o usuário salvar.
 */
export function SceneEmptyState({
	onStartFromSuggestion,
	onStartFromScratch,
}: SceneEmptyStateProps) {
	const { t } = useTranslation("scenes");

	return (
		<section className="flex flex-col gap-6">
			<div className="flex max-w-xl flex-col gap-1">
				<h2 className="text-2xl font-semibold tracking-tight text-foreground">
					{t("empty.title")}
				</h2>
				<p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
			</div>

			<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{SCENE_SUGGESTIONS.map((suggestion) => {
					const Icon = getSceneIcon(suggestion.icon);
					const name = t(suggestion.nameKey, suggestion.defaultName);

					return (
						<li key={suggestion.id}>
							<button
								type="button"
								aria-label={t("empty.suggestionLabel", { name })}
								onClick={() =>
									onStartFromSuggestion({ name, icon: suggestion.icon })
								}
								className="group relative isolate flex min-h-40 w-full cursor-pointer flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border-subtle bg-surface-container p-4 text-left outline-none transition-[border-color,transform] duration-200 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 motion-safe:active:scale-[0.99]"
							>
								<span
									aria-hidden
									className="pointer-events-none absolute inset-0 -z-10 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
									style={{ backgroundImage: suggestion.wash }}
								/>
								<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high/80 text-foreground ring-1 ring-border-subtle">
									<Icon className="h-5 w-5" />
								</span>
								<span className="text-xl font-medium tracking-tight text-foreground">
									{name}
								</span>
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
