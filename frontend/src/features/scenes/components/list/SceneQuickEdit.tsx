import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { useUpdateScene } from "../../hooks/useUpdateScene";
import { supportsLightAttributes } from "../../lib/scene-devices";
import {
	itemFromSceneItem,
	itemsEqual,
	withoutAttributesWhenOff,
} from "../../lib/scene-draft";
import { toDeviceIndex } from "../../lib/scene-view";
import type { SceneFormItem } from "../../types/scene.schemas";
import type { Scene, SceneDevice } from "../../types/scenes.types";
import { AttributeSlider } from "../editor/SceneLightControls";

interface SceneQuickEditProps {
	scene: Scene;
	devices: SceneDevice[];
	onOpenEditor: (scene: Scene) => void;
	onDelete: (scene: Scene) => void;
}

/**
 * Edição rápida da cena selecionada, na coluna lateral da lista: liga/desliga e brilho
 * dos dispositivos que JÁ estão na cena, sem sair da tela. Adicionar ou remover
 * dispositivos é com o editor completo ("Abrir editor"). Só aparece "Salvar" quando há
 * alteração real.
 */
export function SceneQuickEdit({
	scene,
	devices,
	onOpenEditor,
	onDelete,
}: SceneQuickEditProps) {
	const { t } = useTranslation("scenes");
	const updateScene = useUpdateScene();

	const original = useMemo(
		() => scene.items.map(itemFromSceneItem),
		[scene.items],
	);
	const [draft, setDraft] = useState<SceneFormItem[]>(original);

	// Cena trocada ou recarregada do servidor (depois de salvar): volta ao que está salvo.
	useEffect(() => setDraft(original), [original]);

	const deviceById = useMemo(() => toDeviceIndex(devices), [devices]);
	const nameById = useMemo(
		() => new Map(scene.items.map((item) => [item.deviceId, item.deviceName])),
		[scene.items],
	);
	const isDirty = !itemsEqual(draft, original);

	const change = (deviceId: string, patch: Partial<SceneFormItem>) =>
		setDraft((current) =>
			current.map((item) =>
				item.deviceId === deviceId ? { ...item, ...patch } : item,
			),
		);

	const save = () =>
		updateScene.mutate({
			id: scene.id,
			payload: {
				name: scene.name,
				icon: scene.icon,
				items: draft.map(withoutAttributesWhenOff),
			},
		});

	return (
		<section
			aria-label={t("quick.title")}
			className="rounded-xl border border-border-subtle bg-surface-container"
		>
			<header className="flex items-center justify-between gap-2 border-b border-border-subtle p-4">
				<div className="flex min-w-0 flex-col">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("quick.title")}
					</span>
					<h3 className="truncate text-sm font-semibold text-foreground">
						{scene.name}
					</h3>
				</div>
				<button
					type="button"
					onClick={() => onOpenEditor(scene)}
					className="shrink-0 cursor-pointer rounded-md px-1 text-xs text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
				>
					{t("quick.openEditor")}
				</button>
			</header>

			{draft.length === 0 ? (
				<div className="flex flex-col items-start gap-4 p-4">
					<p className="text-sm text-muted-foreground">
						{t("quick.emptyScene")}
					</p>
					<Button size="sm" onClick={() => onOpenEditor(scene)}>
						{t("quick.addDevices")}
					</Button>
				</div>
			) : (
				<ul className="divide-y divide-border-subtle">
					{draft.map((item) => {
						const device = deviceById.get(item.deviceId);
						const name = nameById.get(item.deviceId) ?? item.deviceId;
						const showBrightness =
							item.isOn &&
							device !== undefined &&
							supportsLightAttributes(device);

						return (
							<li key={item.deviceId} className="flex flex-col gap-3 p-4">
								<div className="flex items-center justify-between gap-4">
									<div className="flex min-w-0 flex-col">
										<span className="truncate text-sm font-medium text-foreground">
											{name}
										</span>
										<span className="text-xs text-muted-foreground">
											{[
												device?.room,
												device?.isOnline === false ? t("quick.offline") : null,
											]
												.filter(Boolean)
												.join(" · ")}
										</span>
									</div>
									<Switch
										checked={item.isOn}
										aria-label={t("quick.turnOn", { name })}
										onCheckedChange={(checked) =>
											change(item.deviceId, { isOn: checked })
										}
									/>
								</div>

								{showBrightness && (
									<AttributeSlider
										groupLabel={t("quick.brightnessGroup", { name })}
										label={t("quick.brightness")}
										value={item.brightness}
										onChange={(next) =>
											change(item.deviceId, { brightness: next })
										}
									/>
								)}
							</li>
						);
					})}
				</ul>
			)}

			<footer className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-border-subtle bg-surface-low p-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onDelete(scene)}
					className="text-muted-foreground hover:text-destructive"
				>
					<Trash2 />
					{t("quick.delete")}
				</Button>
				{isDirty && (
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setDraft(original)}
							disabled={updateScene.isPending}
						>
							{t("quick.discard")}
						</Button>
						<Button size="sm" onClick={save} disabled={updateScene.isPending}>
							{t("quick.save")}
						</Button>
					</div>
				)}
			</footer>
		</section>
	);
}
