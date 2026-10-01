import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Play } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormSection } from "@/core/components/forms/FormSection";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet";
import { DEFAULT_SCENE_ICON_ID } from "../../constants/scenes.constants";
import { useActivateScene } from "../../hooks/useActivateScene";
import { useCreateScene } from "../../hooks/useCreateScene";
import { useSceneDevices } from "../../hooks/useSceneDevices";
import { useUpdateScene } from "../../hooks/useUpdateScene";
import {
	createItemFromDevice,
	itemFromSceneItem,
	orderItemsByDevices,
} from "../../lib/scene-draft";
import { useScenesUIStore } from "../../store/scenes-ui.store";
import {
	type SceneFormInput,
	type SceneFormItem,
	type SceneFormOutput,
	sceneFormSchema,
} from "../../types/scene.schemas";
import type { SaveScenePayload, SceneDevice } from "../../types/scenes.types";
import { SceneDevicePicker } from "./SceneDevicePicker";
import { SceneIconPicker } from "./SceneIconPicker";
import { SceneStage } from "./SceneStage";

/** Tipo de dispositivo assumido para o wash quando o dispositivo não está na lista carregada. */
const FALLBACK_DEVICE_TYPE = 2;

/**
 * Painel lateral de criação e edição de cena. O topo é o "palco" (preview ao vivo do
 * clima da cena + nome), depois ícone e dispositivos agrupados por ambiente. Incluir um
 * dispositivo pré-preenche o item com o estado atual dele.
 *
 * "Salvar e testar" salva e em seguida ativa a cena: a API não tem endpoint de teste
 * sobre rascunho, então testar sempre passa por uma cena salva.
 */
export function SceneEditorSheet() {
	const { t } = useTranslation("scenes");
	const isOpen = useScenesUIStore((s) => s.isEditorOpen);
	const editingScene = useScenesUIStore((s) => s.editingScene);
	const seed = useScenesUIStore((s) => s.seed);
	const closeEditor = useScenesUIStore((s) => s.closeEditor);

	const mode: "create" | "edit" = editingScene ? "edit" : "create";
	const confirm = useConfirm();

	const createScene = useCreateScene();
	const updateScene = useUpdateScene();
	const activateScene = useActivateScene();
	const isMutating = createScene.isPending || updateScene.isPending;

	const devicesQuery = useSceneDevices(isOpen);
	const devices = useMemo(() => devicesQuery.data ?? [], [devicesQuery.data]);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors, isDirty, isSubmitted },
	} = useForm<SceneFormInput, undefined, SceneFormOutput>({
		resolver: zodResolver(sceneFormSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: { name: "", icon: DEFAULT_SCENE_ICON_ID, items: [] },
	});

	const items: SceneFormItem[] = watch("items") ?? [];
	const iconId = watch("icon");

	useEffect(() => {
		if (!isOpen) {
			reset();
			return;
		}

		if (editingScene) {
			reset({
				name: editingScene.name,
				icon: editingScene.icon ?? DEFAULT_SCENE_ICON_ID,
				items: editingScene.items.map(itemFromSceneItem),
			});
			return;
		}

		reset({
			name: seed?.name ?? "",
			icon: seed?.icon ?? DEFAULT_SCENE_ICON_ID,
			items: [],
		});
	}, [isOpen, editingScene, seed, reset]);

	const updateItems = (next: SceneFormItem[]) =>
		setValue("items", next, { shouldDirty: true, shouldValidate: isSubmitted });

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

	const handleClose = async () => {
		if (isDirty) {
			const confirmed = await confirm({
				title: t("editor.discard.title"),
				confirmLabel: t("editor.discard.confirm"),
				cancelLabel: t("editor.discard.cancel"),
			});
			if (!confirmed) return;
		}
		closeEditor();
	};

	/** Item que desliga o dispositivo não carrega atributos de luz (não têm efeito). */
	const toPayload = (data: SceneFormOutput): SaveScenePayload => ({
		name: data.name,
		icon: data.icon || null,
		items: orderItemsByDevices(data.items, devices).map((item) =>
			item.isOn
				? item
				: { ...item, brightness: null, colorHex: null, colorTempPercent: null },
		),
	});

	const submit = (thenTest: boolean) =>
		handleSubmit((data) => {
			const payload = toPayload(data);
			const finish = (sceneId: string) => {
				closeEditor();
				if (thenTest) activateScene.mutate(sceneId);
			};

			if (editingScene) {
				updateScene.mutate(
					{ id: editingScene.id, payload },
					{ onSuccess: () => finish(editingScene.id) },
				);
				return;
			}

			createScene.mutate(payload, {
				onSuccess: (response) => finish(response.sceneId),
			});
		});

	const deviceTypeById = useMemo(() => {
		const types = new Map<string, number>(
			(editingScene?.items ?? []).map((item) => [
				item.deviceId,
				item.deviceType,
			]),
		);
		for (const device of devices) types.set(device.id, device.type);
		return types;
	}, [devices, editingScene]);

	const washItems = items.map((item) => ({
		deviceType: deviceTypeById.get(item.deviceId) ?? FALLBACK_DEVICE_TYPE,
		isOn: item.isOn,
		brightness: item.brightness,
		colorHex: item.colorHex,
	}));

	const mutationError =
		createScene.error?.message ?? updateScene.error?.message;

	return (
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) void handleClose();
			}}
		>
			<SheetContent className="gap-0 p-0 sm:max-w-xl">
				<SheetHeader className="gap-1 border-b border-border-subtle p-6 pr-12 text-left">
					<SheetTitle className="text-lg font-semibold tracking-tight text-foreground">
						{mode === "create"
							? t("editor.createTitle")
							: t("editor.editTitle")}
					</SheetTitle>
					<SheetDescription className="text-sm text-muted-foreground">
						{t("editor.description")}
					</SheetDescription>
				</SheetHeader>

				<div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
					<form
						noValidate
						onSubmit={submit(false)}
						className="flex flex-col gap-6"
					>
						<FormGlobalError error={mutationError} />

						<SceneStage
							nameInputProps={register("name")}
							nameError={errors.name?.message}
							iconId={iconId}
							washItems={washItems}
							deviceCount={items.length}
						/>

						<FormSection title={t("editor.iconLabel")}>
							<SceneIconPicker
								value={iconId}
								onChange={(id) => setValue("icon", id, { shouldDirty: true })}
							/>
						</FormSection>

						<FormSection title={t("editor.devicesLabel")}>
							<p className="text-sm text-muted-foreground">
								{t("editor.devicesHint")}
							</p>
							<SceneDevicePicker
								devices={devices}
								items={items}
								isLoading={devicesQuery.isLoading}
								isError={devicesQuery.isError}
								onRetry={() => devicesQuery.refetch()}
								onToggleIncluded={handleToggleIncluded}
								onChangeItem={handleChangeItem}
							/>
							<p className="min-h-4.5 text-xs font-medium text-destructive">
								{errors.items?.message ?? errors.items?.root?.message}
							</p>
						</FormSection>
					</form>
				</div>

				<SheetFooter className="flex-row items-center justify-end gap-2 border-t border-border-subtle bg-surface-low/50 p-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => void handleClose()}
						disabled={isMutating}
					>
						{t("editor.cancel")}
					</Button>
					<Button
						type="button"
						variant="secondary"
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
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
