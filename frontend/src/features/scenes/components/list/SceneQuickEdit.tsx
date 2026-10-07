import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
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

/** A edição rápida mostra só os primeiros dispositivos; o resto é com o editor completo. */
const QUICK_EDIT_LIMIT = 3;

/**
 * Cada dispositivo ocupa um "slot" de altura fixa (com ou sem brilho) e a lista tem
 * sempre QUICK_EDIT_LIMIT slots reservados: o cartão não muda de tamanho ao trocar de cena.
 */
const SLOT_CLASSNAME = "h-28";
const EMPTY_SLOT_KEYS = ["empty-a", "empty-b", "empty-c"];
// O cartão é remontado a cada cena (key = id): o conteúdo entra com fade curto em vez de
// trocar de uma vez. Só a moldura fica parada.
const ENTER_CLASSNAME =
	"motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200";
export const QUICK_EDIT_BODY_CLASSNAME = "h-84";

interface AddDeviceGhostProps {
	title: string;
	hint?: string;
	onClick: () => void;
}

/** Botão tracejado de "adicionar", mesmo estilo do slot vazio de automações no Dashboard. */
function AddDeviceGhost({ title, hint, onClick }: AddDeviceGhostProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex h-16 w-full cursor-pointer items-center gap-4 rounded-lg border border-dashed border-border-subtle bg-surface-low/20 p-4 text-left outline-none transition-all hover:border-primary/40 hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-high text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
				<Plus className="h-4 w-4" aria-hidden />
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="text-sm font-medium text-foreground/80 transition-colors group-hover:text-foreground">
					{title}
				</span>
				{hint && <span className="text-xs text-muted-foreground">{hint}</span>}
			</span>
		</button>
	);
}

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
				<div
					className={cn("flex min-w-0 items-baseline gap-2", ENTER_CLASSNAME)}
				>
					<span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("quick.title")}
					</span>
					<span aria-hidden className="text-muted-foreground">
						·
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
				<div
					className={cn(
						"flex flex-col items-stretch justify-center gap-4 p-4",
						ENTER_CLASSNAME,
						QUICK_EDIT_BODY_CLASSNAME,
					)}
				>
					<p className="text-sm text-muted-foreground">
						{t("quick.emptyScene")}
					</p>
					<AddDeviceGhost
						title={t("quick.addDevices")}
						onClick={() => onOpenEditor(scene)}
					/>
				</div>
			) : (
				<ul
					className={cn(
						"grid grid-rows-3 divide-y divide-border-subtle",
						ENTER_CLASSNAME,
						QUICK_EDIT_BODY_CLASSNAME,
					)}
				>
					{draft.slice(0, QUICK_EDIT_LIMIT).map((item) => {
						const device = deviceById.get(item.deviceId);
						const name = nameById.get(item.deviceId) ?? item.deviceId;
						const detail = [
							device?.room,
							device?.isOnline === false ? t("quick.offline") : null,
						]
							.filter(Boolean)
							.join(" · ");
						// O controle extra (brilho) abre e fecha animando a altura: a linha do nome sobe pra
						// dar lugar a ele e volta ao centro quando ele some, sem salto.
						const hasControls =
							device !== undefined && supportsLightAttributes(device);
						const showBrightness = item.isOn && hasControls;

						return (
							<li
								key={item.deviceId}
								className={cn(
									"flex flex-col justify-center px-4",
									SLOT_CLASSNAME,
								)}
							>
								<div className="flex items-center justify-between gap-4">
									<div className="flex min-w-0 items-baseline gap-2">
										<span className="truncate text-sm font-medium text-foreground">
											{name}
										</span>
										{detail && (
											<span className="shrink-0 text-xs text-muted-foreground">
												· {detail}
											</span>
										)}
									</div>
									<Switch
										checked={item.isOn}
										aria-label={t("quick.turnOn", { name })}
										onCheckedChange={(checked) =>
											change(item.deviceId, { isOn: checked })
										}
									/>
								</div>

								{hasControls && (
									<div
										inert={!showBrightness}
										aria-hidden={!showBrightness}
										className={cn(
											"grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
											showBrightness
												? "grid-rows-[1fr] opacity-100"
												: "grid-rows-[0fr] opacity-0",
										)}
									>
										<div
											className={cn(
												"min-h-0",
												// Aberto, deixa o botão do slider (e o anel de foco) passar da caixa.
												!showBrightness && "overflow-hidden",
											)}
										>
											<div className="pt-3">
												<AttributeSlider
													groupLabel={t("quick.brightnessGroup", { name })}
													label={t("quick.brightness")}
													value={item.brightness}
													onChange={(next) =>
														change(item.deviceId, { brightness: next })
													}
												/>
											</div>
										</div>
									</div>
								)}
							</li>
						);
					})}
					{EMPTY_SLOT_KEYS.slice(
						0,
						QUICK_EDIT_LIMIT - Math.min(draft.length, QUICK_EDIT_LIMIT),
					).map((key, position) =>
						position === 0 ? (
							<li
								key={key}
								className={cn("flex items-center px-4", SLOT_CLASSNAME)}
							>
								<AddDeviceGhost
									title={t("quick.addDevice")}
									hint={t("quick.addDeviceHint")}
									onClick={() => onOpenEditor(scene)}
								/>
							</li>
						) : (
							<li key={key} aria-hidden className={SLOT_CLASSNAME} />
						),
					)}
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
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setDraft(original)}
						disabled={!isDirty || updateScene.isPending}
					>
						{t("quick.discard")}
					</Button>
					<Button
						size="sm"
						onClick={save}
						disabled={!isDirty || updateScene.isPending}
					>
						{t("quick.save")}
					</Button>
				</div>
			</footer>
		</section>
	);
}
