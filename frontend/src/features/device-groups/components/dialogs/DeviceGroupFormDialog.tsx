import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormSection } from "@/core/components/forms/FormSection";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { ScrollFadeBottom } from "@/core/components/ui/scroll-fade-bottom";
import { cn } from "@/core/utils";
import { GROUP_ICON_OPTIONS } from "../../constants/device-groups.constants";
import { useCreateDeviceGroup } from "../../hooks/useCreateDeviceGroup";
import { useUpdateDeviceGroup } from "../../hooks/useUpdateDeviceGroup";
import { useDeviceGroupsUIStore } from "../../store/device-groups-ui.store";
import {
	type CreateDeviceGroupFormInput,
	type CreateDeviceGroupFormOutput,
	createDeviceGroupSchema,
} from "../../types/device-group.schemas";
import { DeviceGroupMultiSelect } from "../DeviceGroupMultiSelect";

/**
 * Unified Dialog for creating and editing a Device Group.
 * Mirrors `RoomFormDialog` with top header, scrollable body with `ScrollFadeBottom`,
 * and pinned footer with action buttons.
 */
export function DeviceGroupFormDialog() {
	const { t } = useTranslation("device-groups");
	const isCreateDialogOpen = useDeviceGroupsUIStore(
		(s) => s.isCreateDialogOpen,
	);
	const editingGroup = useDeviceGroupsUIStore((s) => s.editingGroup);
	const focusDevices = useDeviceGroupsUIStore((s) => s.editDialogFocusDevices);
	const closeFormDialog = useDeviceGroupsUIStore((s) => s.closeFormDialog);

	const mode: "create" | "edit" = editingGroup ? "edit" : "create";
	const isOpen = isCreateDialogOpen || Boolean(editingGroup);

	const createGroup = useCreateDeviceGroup();
	const updateGroup = useUpdateDeviceGroup();
	const confirm = useConfirm();

	const isMutating = createGroup.isPending || updateGroup.isPending;

	const {
		register,
		control,
		handleSubmit,
		reset,
		setValue,
		setFocus,
		watch,
		formState: { errors, isDirty },
	} = useForm<
		CreateDeviceGroupFormInput,
		undefined,
		CreateDeviceGroupFormOutput
	>({
		resolver: zodResolver(createDeviceGroupSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: { name: "", icon: "layers", deviceIds: [] },
	});

	const deviceIds = watch("deviceIds") || [];
	const deviceSectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) {
			reset();
			return;
		}

		if (editingGroup) {
			reset({
				name: editingGroup.name,
				icon: editingGroup.icon ?? "layers",
				deviceIds: editingGroup.devices.map((d) => d.id),
			});
		} else {
			reset({ name: "", icon: "layers", deviceIds: [] });
		}

		setFocus("name");
	}, [isOpen, editingGroup, reset, setFocus]);

	useEffect(() => {
		if (isOpen && focusDevices) {
			deviceSectionRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [isOpen, focusDevices]);

	const handleClose = async () => {
		if (isDirty) {
			const confirmed = await confirm({
				title: t(
					"form.discardConfirm",
					"Descartar as alterações feitas neste grupo?",
				),
				confirmLabel: t("form.discardConfirmButton", "Descartar"),
			});
			if (!confirmed) return;
		}
		closeFormDialog();
	};

	const onSubmit = (data: CreateDeviceGroupFormOutput) => {
		if (mode === "create") {
			createGroup.mutate(
				{
					name: data.name,
					icon: data.icon ?? null,
					deviceIds: data.deviceIds,
				},
				{
					onSuccess: () => {
						closeFormDialog();
					},
				},
			);
			return;
		}

		if (!editingGroup) return;
		updateGroup.mutate(
			{
				id: editingGroup.id,
				payload: {
					name: data.name,
					icon: data.icon ?? null,
					deviceIds: data.deviceIds,
				},
			},
			{
				onSuccess: () => {
					closeFormDialog();
				},
			},
		);
	};

	const mutationError =
		createGroup.error?.message ?? updateGroup.error?.message;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl border border-border-subtle bg-popover p-0 shadow-xl sm:max-w-2xl">
				<div className="flex max-h-[85vh] flex-col">
					{/* Header */}
					<div className="flex items-start gap-4 border-b border-border-subtle bg-surface-low/30 p-6 pb-4">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
							<Boxes className="h-5 w-5" />
						</span>
						<DialogHeader className="gap-1 text-left">
							<DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
								{mode === "create"
									? t("form.create.title", "Adicionar Novo Grupo")
									: t("form.edit.title", "Editar Grupo")}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								{mode === "create"
									? t(
											"form.create.description",
											"Crie um grupo de dispositivos para controlar vários equipamentos de uma só vez.",
										)
									: t(
											"form.edit.description",
											"Altere o nome, o ícone ou os dispositivos vinculados a este grupo.",
										)}
							</DialogDescription>
						</DialogHeader>
					</div>

					{/* Body with scroll */}
					<div className="relative min-h-0 flex-1">
						<div className="h-full overflow-y-auto p-6 scrollbar-thin">
							<div className="flex flex-col gap-6">
								<FormGlobalError error={mutationError} />

								<FormSection
									title={t("form.fields.name.label", "Nome do Grupo *")}
									htmlFor="group-name"
								>
									<input
										id="group-name"
										type="text"
										placeholder={t(
											"form.fields.name.placeholder",
											"Ex: Todas as Luzes, Home Theater, Segurança",
										)}
										maxLength={100}
										aria-invalid={!!errors.name}
										className="h-9 w-full rounded-lg border border-border-subtle bg-surface-container px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/40"
										{...register("name")}
									/>
									<p className="min-h-4.5 text-xs font-medium text-destructive">
										{errors.name?.message}
									</p>
								</FormSection>

								<FormSection
									title={t("form.fields.icon.label", "Ícone do Grupo")}
								>
									<Controller
										control={control}
										name="icon"
										render={({ field }) => (
											<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
												{GROUP_ICON_OPTIONS.map((option) => {
													const IconComponent = option.icon;
													const isSelected = field.value === option.id;

													return (
														<button
															key={option.id}
															type="button"
															onClick={() => field.onChange(option.id)}
															aria-label={t(option.labelKey, option.id)}
															aria-pressed={isSelected}
															className={cn(
																"flex flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
																isSelected
																	? "border-primary/50 bg-primary/10 text-primary shadow-xs"
																	: "border-border-subtle bg-surface-container text-muted-foreground hover:bg-surface-high hover:text-foreground",
															)}
														>
															<IconComponent className="h-5 w-5" />
															<span className="text-[10px] font-medium">
																{t(option.labelKey, option.id)}
															</span>
														</button>
													);
												})}
											</div>
										)}
									/>
									{errors.icon?.message && (
										<p className="text-xs font-medium text-destructive">
											{errors.icon.message}
										</p>
									)}
								</FormSection>

								<div ref={deviceSectionRef}>
									<FormSection
										title={t(
											"form.fields.devices.label",
											"Dispositivos do Grupo *",
										)}
									>
										<DeviceGroupMultiSelect
											id="group-devices"
											label={t(
												"form.fields.devices.label",
												"Dispositivos do Grupo",
											)}
											selectedIds={deviceIds}
											onChange={(ids) =>
												setValue("deviceIds", ids, {
													shouldDirty: true,
													shouldValidate: true,
												})
											}
											error={errors.deviceIds?.message}
											disabled={isMutating}
										/>
									</FormSection>
								</div>
							</div>
						</div>
						<ScrollFadeBottom />
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-2 border-t border-border-subtle bg-surface-low/50 p-4">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isMutating}
							className="border-border-subtle bg-surface-container text-foreground hover:bg-surface-high"
						>
							{t("form.cancel", "Cancelar")}
						</Button>
						<Button
							type="button"
							onClick={handleSubmit(onSubmit)}
							disabled={isMutating}
							className="bg-primary text-primary-foreground shadow-xs hover:opacity-90"
						>
							{isMutating && (
								<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
							)}
							{mode === "create"
								? t("form.create.submitButton", "Registrar Grupo")
								: t("form.edit.submitButton", "Salvar Alterações")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
