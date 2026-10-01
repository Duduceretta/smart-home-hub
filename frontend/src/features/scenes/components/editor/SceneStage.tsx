import type { InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { getSceneIcon } from "../../constants/scenes.constants";
import { buildSceneBackdrop, type SceneWashItem } from "../../lib/scene-wash";

interface SceneStageProps {
	/** Props do `register("name")` do react-hook-form. */
	nameInputProps: InputHTMLAttributes<HTMLInputElement>;
	nameError?: string;
	iconId: string | undefined;
	washItems: SceneWashItem[];
	deviceCount: number;
}

/**
 * "Palco" do editor: um cartão que reproduz ao vivo o clima da cena (o mesmo light
 * wash do cartão da galeria) enquanto o usuário escolhe dispositivos e cores, com o
 * nome da cena em destaque tipográfico. É a identidade da tela de cenas dentro do editor.
 */
export function SceneStage({
	nameInputProps,
	nameError,
	iconId,
	washItems,
	deviceCount,
}: SceneStageProps) {
	const { t } = useTranslation("scenes");
	const Icon = getSceneIcon(iconId);
	const wash = buildSceneBackdrop(washItems);

	return (
		<div className="relative isolate flex min-h-44 flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border-subtle bg-surface-container p-4">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 opacity-90"
				style={wash ? { backgroundImage: wash } : undefined}
			/>

			<div className="flex items-center justify-between gap-2">
				<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high/80 text-foreground ring-1 ring-border-subtle">
					<Icon className="h-5 w-5" />
				</span>
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("editor.selectedCount", { count: deviceCount })}
				</span>
			</div>

			<div className="flex flex-col gap-1">
				<label htmlFor="scene-name" className="sr-only">
					{t("editor.nameLabel")}
				</label>
				<input
					id="scene-name"
					type="text"
					maxLength={100}
					placeholder={t("editor.namePlaceholder")}
					aria-invalid={!!nameError}
					className="w-full border-b border-border-subtle bg-transparent pb-1 text-2xl font-semibold tracking-tight text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
					{...nameInputProps}
				/>
				<p className="min-h-4.5 text-xs font-medium text-destructive">
					{nameError}
				</p>
			</div>
		</div>
	);
}
