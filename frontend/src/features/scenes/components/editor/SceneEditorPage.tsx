import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	useBlocker,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormSection } from "@/core/components/forms/FormSection";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { DEFAULT_SCENE_ICON_ID } from "../../constants/scenes.constants";
import { useActivateScene } from "../../hooks/useActivateScene";
import { useCreateScene } from "../../hooks/useCreateScene";
import { useDeleteScene } from "../../hooks/useDeleteScene";
import { useSceneDevices } from "../../hooks/useSceneDevices";
import { useScenes } from "../../hooks/useScenes";
import { useUpdateScene } from "../../hooks/useUpdateScene";
import {
	createItemFromDevice,
	itemFromSceneItem,
	toPayloadItems,
} from "../../lib/scene-draft";
import {
	buildPresetItems,
	SCENE_PRESETS,
	type ScenePreset,
} from "../../lib/scene-presets";
import {
	type SceneFormInput,
	type SceneFormItem,
	type SceneFormOutput,
	sceneFormSchema,
} from "../../types/scene.schemas";
import type { SaveScenePayload, SceneDevice } from "../../types/scenes.types";
import { SceneDevicePicker } from "./SceneDevicePicker";
import { SceneIconPicker } from "./SceneIconPicker";
import { ScenePresetsPanel } from "./ScenePresetsPanel";
import { SceneStage } from "./SceneStage";

const SCENES_PATH = "/scenes";

/**
 * Avisos desta página saem no topo: o canto inferior direito, padrão do app, fica em cima
 * dos botões da barra de ações fixa e os cobriria justo quando o usuário vai salvar.
 */
const TOAST_POSITION = "top-center";

/**
 * Página de criação e edição de cena (`/scenes/new` e `/scenes/:id/edit`). Não é modal:
 * a tela inteira vira o editor, com URL própria, botão voltar funcionando e aviso ao sair
 * com alterações. À esquerda o formulário (nome, ícone, dispositivos); à direita a prévia
 * ao vivo do clima da cena e as predefinições. Incluir um dispositivo copia o estado atual
 * dele.
 *
 * "Salvar e testar" salva e em seguida ativa a cena: a API não tem endpoint de teste
 * sobre rascunho, então testar sempre passa por uma cena salva.
 */
export function SceneEditorPage() {
	const { t } = useTranslation("scenes");
	const { id } = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const confirm = useConfirm();

	const mode: "create" | "edit" = id ? "edit" : "create";

	const scenesQuery = useScenes();
	const scene = useMemo(
		() => scenesQuery.data?.find((entry) => entry.id === id),
		[scenesQuery.data, id],
	);
	const devicesQuery = useSceneDevices();
	const devices = useMemo(() => devicesQuery.data ?? [], [devicesQuery.data]);

	const createScene = useCreateScene();
	const updateScene = useUpdateScene();
	const deleteScene = useDeleteScene();
	const activateScene = useActivateScene();
	const isMutating =
		createScene.isPending || updateScene.isPending || deleteScene.isPending;

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		getValues,
		watch,
		formState: { errors, isDirty, isSubmitted },
	} = useForm<SceneFormInput, undefined, SceneFormOutput>({
		resolver: zodResolver(sceneFormSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: { name: "", icon: DEFAULT_SCENE_ICON_ID, items: [] },
	});

	const items: SceneFormItem[] = watch("items") ?? [];
	const name = watch("name") ?? "";
	const iconId = watch("icon");

	// Quando o usuário já confirmou sair (Cancelar, salvar), o bloqueio de navegação não pergunta de novo.
	const leavingRef = useRef(false);

	// Preenche o formulário uma vez por cena: salvar invalida a lista e a cena muda de
	// referência, mas isso não pode sobrescrever o que o usuário está digitando.
	const initializedFor = useRef<string | null>(null);
	useEffect(() => {
		if (mode === "create") {
			if (initializedFor.current === "new") return;
			initializedFor.current = "new";
			reset({ name: "", icon: DEFAULT_SCENE_ICON_ID, items: [] });
			return;
		}

		if (!scene || initializedFor.current === scene.id) return;
		initializedFor.current = scene.id;
		reset({
			name: scene.name,
			icon: scene.icon ?? DEFAULT_SCENE_ICON_ID,
			items: scene.items.map(itemFromSceneItem),
		});
	}, [mode, scene, reset]);

	const updateItems = useCallback(
		(next: SceneFormItem[]) =>
			setValue("items", next, {
				shouldDirty: true,
				shouldValidate: isSubmitted,
			}),
		[setValue, isSubmitted],
	);

	const handleToggleIncluded = (device: SceneDevice) => {
		const isIncluded = items.some((item) => item.deviceId === device.id);

		updateItems(
			isIncluded
				? items.filter((item) => item.deviceId !== device.id)
				: [...items, createItemFromDevice(device)],
		);
	};

	const handleChangeItem = (deviceId: string, patch: Partial<SceneFormItem>) =>
		updateItems(
			items.map((item) =>
				item.deviceId === deviceId ? { ...item, ...patch } : item,
			),
		);

	const handleSetRoom = (roomDevices: SceneDevice[], include: boolean) => {
		const roomIds = new Set(roomDevices.map((device) => device.id));
		const kept = items.filter((item) => !roomIds.has(item.deviceId));

		if (!include) {
			updateItems(kept);
			return;
		}

		const alreadyIncluded = new Map(items.map((item) => [item.deviceId, item]));
		updateItems([
			...kept,
			...roomDevices.map(
				(device) =>
					alreadyIncluded.get(device.id) ?? createItemFromDevice(device),
			),
		]);
	};

	const handleSelectLights = () => {
		const lights = devices.filter((device) => device.type === 1);
		const alreadyIncluded = new Map(items.map((item) => [item.deviceId, item]));

		updateItems([
			...items,
			...lights
				.filter((light) => !alreadyIncluded.has(light.id))
				.map(createItemFromDevice),
		]);
	};

	const handleAllOff = () =>
		updateItems(items.map((item) => ({ ...item, isOn: false })));

	const confirmDiscard = () =>
		confirm({
			title: t("editor.discard.title"),
			confirmLabel: t("editor.discard.confirm"),
			cancelLabel: t("editor.discard.cancel"),
		});

	const leave = (path: string) => {
		leavingRef.current = true;
		navigate(path);
	};

	const handleCancel = async () => {
		if (isDirty && !(await confirmDiscard())) return;
		leave(SCENES_PATH);
	};

	// Sair por outro caminho (menu lateral, botão voltar do navegador) também pergunta.
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			isDirty &&
			!leavingRef.current &&
			currentLocation.pathname !== nextLocation.pathname,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: o diálogo só deve reabrir quando o bloqueio muda de estado
	useEffect(() => {
		if (blocker.state !== "blocked") return;

		void confirmDiscard().then((discard) =>
			discard ? blocker.proceed() : blocker.reset(),
		);
	}, [blocker.state]);

	const applyPreset = useCallback(
		async (preset: ScenePreset, { askBeforeReplacing = true } = {}) => {
			const presetName = t(preset.nameKey, preset.defaultName);
			const presetItems = buildPresetItems(preset, devices);

			if (presetItems.length === 0) {
				toast.warning(t("presets.noCompatible", { name: presetName }), {
					position: TOAST_POSITION,
				});
				return;
			}

			if (askBeforeReplacing && getValues("items").length > 0) {
				const replace = await confirm({
					title: t("presets.replaceConfirm.title"),
					description: t("presets.replaceConfirm.description", {
						name: presetName,
					}),
					confirmLabel: t("presets.replaceConfirm.confirm"),
					cancelLabel: t("presets.replaceConfirm.cancel"),
				});
				if (!replace) return;
			}

			setValue("items", presetItems, { shouldDirty: true });
			setValue("icon", preset.icon, { shouldDirty: true });
			// Um nome que o usuário já digitou não é sobrescrito.
			if (!getValues("name").trim()) {
				setValue("name", presetName, { shouldDirty: true });
			}
			toast.info(t("presets.applied", { name: presetName }), {
				position: TOAST_POSITION,
			});
		},
		[confirm, devices, getValues, setValue, t],
	);

	// Vindo de uma predefinição da lista (`?preset=relax`): aplica uma vez, quando os dispositivos chegam.
	const presetId = searchParams.get("preset");
	const urlPresetApplied = useRef(false);
	useEffect(() => {
		if (mode !== "create" || !presetId) return;
		if (urlPresetApplied.current || !devicesQuery.isSuccess) return;

		urlPresetApplied.current = true;
		const preset = SCENE_PRESETS.find((entry) => entry.id === presetId);
		if (preset) void applyPreset(preset, { askBeforeReplacing: false });
	}, [mode, presetId, devicesQuery.isSuccess, applyPreset]);

	const submit = (thenTest: boolean) =>
		handleSubmit((data) => {
			const payload: SaveScenePayload = {
				name: data.name,
				icon: data.icon || null,
				items: toPayloadItems(data.items, devices),
			};
			const finish = (sceneId: string) => {
				leave(`${SCENES_PATH}?scene=${sceneId}`);
				if (thenTest) activateScene.mutate(sceneId);
			};

			if (scene) {
				updateScene.mutate(
					{ id: scene.id, payload },
					{ onSuccess: () => finish(scene.id) },
				);
				return;
			}

			createScene.mutate(payload, {
				onSuccess: (response) => finish(response.sceneId),
			});
		});

	const handleDelete = async () => {
		if (!scene) return;

		const confirmed = await confirm({
			title: t("deleteDialog.title"),
			description: t("deleteDialog.description", { name: scene.name }),
			confirmLabel: t("deleteDialog.confirm"),
			cancelLabel: t("deleteDialog.cancel"),
			variant: "destructive",
			icon: Trash2,
		});
		if (!confirmed) return;

		deleteScene.mutate(scene.id, { onSuccess: () => leave(SCENES_PATH) });
	};

	const breadcrumb = (
		<nav
			aria-label={t("editor.breadcrumbScenes")}
			className="flex items-center gap-2 text-sm text-muted-foreground"
		>
			<button
				type="button"
				onClick={() => void handleCancel()}
				className="cursor-pointer rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				{t("editor.breadcrumbScenes")}
			</button>
			<span aria-hidden>/</span>
			<span className="text-foreground">
				{mode === "create" ? t("editor.createTitle") : scene?.name}
			</span>
		</nav>
	);

	if (mode === "edit" && scenesQuery.isError && !scenesQuery.data) {
		return (
			<div className="flex flex-col gap-6">
				{breadcrumb}
				<CardErrorFallback
					message={t("page.loadError")}
					retryLabel={t("page.retry")}
					onRetry={() => scenesQuery.refetch()}
				/>
			</div>
		);
	}

	if (mode === "edit" && scenesQuery.isSuccess && !scene) {
		return (
			<div className="flex flex-col items-start gap-4">
				{breadcrumb}
				<p className="text-sm text-muted-foreground">{t("page.notFound")}</p>
				<Button variant="outline" onClick={() => leave(SCENES_PATH)}>
					{t("page.backToScenes")}
				</Button>
			</div>
		);
	}

	if (mode === "edit" && !scene) {
		return (
			<div
				role="status"
				aria-busy="true"
				aria-label={t("page.loading")}
				className="flex animate-pulse flex-col gap-6"
			>
				<div className="h-5 w-40 rounded-md bg-surface-high" />
				<div className="h-12 w-2/3 rounded-md bg-surface-high" />
				<div className="h-64 rounded-xl bg-surface-high" />
			</div>
		);
	}

	const mutationError =
		createScene.error?.message ??
		updateScene.error?.message ??
		deleteScene.error?.message;

	return (
		<div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
			{breadcrumb}
			<h1 className="sr-only">
				{mode === "create"
					? t("editor.createTitle")
					: t("editor.editTitle", { name: scene?.name ?? "" })}
			</h1>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start">
				<form
					noValidate
					onSubmit={submit(false)}
					className="flex min-w-0 flex-col gap-6"
				>
					<FormGlobalError error={mutationError} />

					<div className="flex flex-col gap-1">
						<label htmlFor="scene-name" className="sr-only">
							{t("editor.nameLabel")}
						</label>
						<input
							id="scene-name"
							type="text"
							maxLength={100}
							placeholder={t("editor.namePlaceholder")}
							aria-invalid={!!errors.name}
							className="w-full border-b border-border-subtle bg-transparent pb-2 text-3xl font-semibold tracking-tight text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
							{...register("name")}
						/>
						<p className="min-h-4.5 text-xs font-medium text-destructive">
							{errors.name?.message}
						</p>
					</div>

					<FormSection title={t("editor.iconLabel")}>
						<SceneIconPicker
							value={iconId}
							onChange={(icon) => setValue("icon", icon, { shouldDirty: true })}
						/>
					</FormSection>

					<FormSection title={t("editor.devicesLabel")}>
						<p className="text-sm text-muted-foreground">
							{t("editor.devicesHint", { count: items.length })}
						</p>
						<SceneDevicePicker
							devices={devices}
							items={items}
							isLoading={devicesQuery.isLoading}
							isError={devicesQuery.isError}
							onRetry={() => devicesQuery.refetch()}
							onToggleIncluded={handleToggleIncluded}
							onChangeItem={handleChangeItem}
							onSetRoom={handleSetRoom}
							onSelectLights={handleSelectLights}
							onAllOff={handleAllOff}
							onClear={() => updateItems([])}
						/>
						<p className="min-h-4.5 text-xs font-medium text-destructive">
							{errors.items?.message ?? errors.items?.root?.message}
						</p>
					</FormSection>
				</form>

				<aside className="flex flex-col gap-4 lg:sticky lg:top-4">
					<SceneStage
						name={name}
						iconId={iconId}
						items={items}
						devices={devices}
					/>
					<ScenePresetsPanel onApply={(preset) => void applyPreset(preset)} />
				</aside>
			</div>

			<div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-low/95 p-4 backdrop-blur-sm">
				<span className="text-sm text-muted-foreground">
					{isDirty
						? t("editor.unsaved")
						: items.length > 0
							? t("editor.selectedCount", { count: items.length })
							: t("editor.barEmpty")}
				</span>
				<div className="flex flex-wrap items-center gap-2">
					{mode === "edit" && (
						<Button
							type="button"
							variant="ghost"
							onClick={() => void handleDelete()}
							disabled={isMutating}
							className="text-muted-foreground hover:text-destructive"
						>
							<Trash2 />
							{t("editor.delete")}
						</Button>
					)}
					<Button
						type="button"
						variant="ghost"
						onClick={() => void handleCancel()}
						disabled={isMutating}
					>
						{t("editor.cancel")}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={submit(false)}
						disabled={isMutating}
					>
						{isMutating && <Loader2 className="animate-spin" />}
						{t("editor.save")}
					</Button>
					<Button type="button" onClick={submit(true)} disabled={isMutating}>
						<Play />
						{t("editor.saveAndTest")}
					</Button>
				</div>
			</div>
		</div>
	);
}
