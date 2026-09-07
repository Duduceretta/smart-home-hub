import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sliders, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { StaleDataIndicator } from "@/core/components/feedback/StaleDataIndicator";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { cn } from "@/core/utils";
import { useDeleteDevice } from "../../hooks/useDeleteDevice";
import { useDevice } from "../../hooks/useDevice";
import { useUpdateDevice } from "../../hooks/useUpdateDevice";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import {
	type UpdateDeviceFormInput,
	type UpdateDeviceFormOutput,
	updateDeviceSchema,
} from "../../types/device.schemas";
import { EditDeviceAdvancedSection } from "./EditDeviceAdvancedSection";
import { EditDeviceGeneralTab } from "./EditDeviceGeneralTab";

/**
 * Espelha a casca do formulário real (cabeçalho com ícone/título/badges,
 * grid de campos, tabs de integração, pills de ambiente, rodapé de ações)
 * durante `isLoadingDevice` — substitui o spinner central genérico que
 * ocupava a mesma altura sem indicar a estrutura que está por vir.
 */
function EditDeviceModalSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="flex max-h-full flex-col animate-pulse sm:max-h-[85vh]"
		>
			<div className="flex items-start gap-4 border-b border-border-subtle/60 bg-surface-low/30 p-6 pb-4">
				<div className="h-10 w-10 shrink-0 rounded-xl bg-surface-high" />
				<div className="flex flex-1 flex-col gap-2">
					<div className="h-4 w-40 rounded-sm bg-surface-high" />
					<div className="h-3 w-56 rounded-sm bg-surface-high/60" />
					<div className="mt-2 flex items-center gap-2">
						<div className="h-6 w-20 rounded-full bg-surface-high" />
						<div className="h-6 w-16 rounded-full bg-surface-high/60" />
					</div>
				</div>
			</div>

			<div className="flex-1 p-6">
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
						<div className="h-12.5 rounded-lg bg-surface-container" />
						<div className="h-12.5 rounded-lg bg-surface-container" />
						<div className="h-12.5 rounded-lg bg-surface-container" />
						<div className="h-12.5 rounded-lg bg-surface-container" />
					</div>
					<div className="h-9 w-full rounded-xl bg-surface-container" />
					<div className="flex flex-wrap gap-1.5">
						<div className="h-7.5 w-20 rounded-lg bg-surface-container" />
						<div className="h-7.5 w-24 rounded-lg bg-surface-container" />
						<div className="h-7.5 w-16 rounded-lg bg-surface-container" />
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between border-t border-border-subtle/60 bg-surface-low/50 px-6 py-3.5">
				<div className="h-8.5 w-24 rounded-lg bg-surface-container" />
				<div className="flex items-center gap-2.5">
					<div className="h-8.5 w-20 rounded-lg bg-surface-container" />
					<div className="h-8.5 w-24 rounded-lg bg-surface-container" />
				</div>
			</div>
		</div>
	);
}

/**
 * Fallback local (neutro, `border-dashed`, sem vermelho) pra quando
 * `useDevice` falha de verdade — distinto do skeleton, que antes cobria
 * silenciosamente esse caso e deixava o modal preso em "carregando" pra
 * sempre (`isLoadingDevice` vira `false`, mas `device` nunca chega a existir).
 */
function EditDeviceModalErrorFallback({
	onRetry,
	onClose,
}: {
	onRetry: () => void;
	onClose: () => void;
}) {
	const { t } = useTranslation(["devices", "common"]);

	return (
		<div
			role="alert"
			className="flex h-72 flex-col items-center justify-center gap-3 p-6 text-center"
		>
			<div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border-subtle bg-surface-low/50 text-muted-foreground">
				<TriangleAlert className="h-5 w-5" />
			</div>
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium text-foreground">
					{t("form.edit.errorTitle")}
				</p>
				<p className="max-w-xs text-xs text-muted-foreground">
					{t("form.edit.errorDescription")}
				</p>
			</div>
			<div className="flex items-center gap-2.5">
				<button
					type="button"
					onClick={onClose}
					className="h-8.5 rounded-lg border border-border-subtle bg-surface-container px-3.5 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-surface-high hover:text-foreground cursor-pointer shadow-xs"
				>
					{t("common:actions.cancel")}
				</button>
				<button
					type="button"
					onClick={onRetry}
					className="inline-flex h-8.5 items-center gap-2 rounded-lg border border-border bg-surface-high px-4 text-xs font-semibold text-foreground transition-all hover:border-foreground/30 hover:bg-surface-highest cursor-pointer shadow-xs active:scale-[0.98]"
				>
					{t("common:actions.retry")}
				</button>
			</div>
		</div>
	);
}

/**
 * Orchestrates the Edit Device dialog: form lifecycle (reset on device
 * load/close), the shared `useForm` instance handed down to
 * `EditDeviceGeneralTab`/`EditDeviceAdvancedSection` via `FormProvider`,
 * the advanced-section open/close toggle, and submit/delete. Field-level
 * markup and per-integration visibility rules live in those two
 * subcomponents — they consume the form via `useFormContext`, never
 * duplicate state here.
 */
export const EditDeviceModal: React.FC = () => {
	const { t } = useTranslation(["devices", "common"]);
	const editingDevice = useDevicesUIStore((s) => s.editingDevice);
	const closeEditModal = useDevicesUIStore((s) => s.closeEditModal);
	const isOpen = Boolean(editingDevice);
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
	const confirm = useConfirm();

	const {
		data: device,
		isLoading: isLoadingDevice,
		isError: isDeviceError,
		refetch: refetchDevice,
	} = useDevice(editingDevice?.id ?? "");
	const {
		mutate: updateDevice,
		isPending: isUpdating,
		error: updateError,
	} = useUpdateDevice();
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();

	const formMethods = useForm<
		UpdateDeviceFormInput,
		undefined,
		UpdateDeviceFormOutput
	>({
		resolver: zodResolver(updateDeviceSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});
	const { handleSubmit, reset } = formMethods;

	// Usa reset() explícito (em vez do `values` declarativo do RHF) porque o
	// Controller do FormSelect (Radix Select) não sincroniza de forma
	// confiável com atualizações assíncronas via `values` — o campo fica
	// vazio até o usuário interagir manualmente com o select.
	useEffect(() => {
		if (device) {
			reset({
				name: device.name,
				brand: device.brand,
				externalId: device.externalId,
				ipAddress: device.ipAddress ?? null,
				type: device.type,
				integrationType: device.integrationType,
				roomId: device.roomId ?? "",
				// Não vêm do GET (write-only no backend) — ficam em branco;
				// deixar em branco no submit preserva o valor já salvo.
				macAddress: "",
				localKey: "",
				protocolVersion: "",
				dpsPowerKey: "",
				clientKey: "",
				supportsColor: device.supportsColorOverride,
			});
		}
	}, [device, reset]);

	useEffect(() => {
		if (!isOpen) {
			reset();
			setIsAdvancedOpen(false);
		}
	}, [isOpen, reset]);

	const onSubmit = (data: UpdateDeviceFormOutput) => {
		if (!editingDevice?.id) return;

		updateDevice(
			{ id: editingDevice.id, payload: data },
			{ onSuccess: () => closeEditModal() },
		);
	};

	const handleDeleteClick = async () => {
		if (!editingDevice?.id) return;

		const confirmed = await confirm({
			title: t("deleteModal.title"),
			description: (
				<Trans
					t={t}
					i18nKey="deleteModal.description"
					values={{ name: device?.name ?? "" }}
					components={{
						bold: <span className="font-semibold text-destructive" />,
					}}
				/>
			),
			confirmLabel: t("common:actions.delete"),
			cancelLabel: t("common:actions.cancel"),
			variant: "destructive",
			icon: Trash2,
		});
		if (!confirmed) return;

		deleteDevice(editingDevice.id, { onSuccess: () => closeEditModal() });
	};

	const isBusy = isUpdating || isLoadingDevice || isDeleting;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) closeEditModal();
			}}
		>
			<DialogContent
				className={cn(
					"gap-0 overflow-hidden border border-border-subtle bg-surface-container p-0 text-foreground shadow-2xl sm:max-w-2xl sm:rounded-2xl",
					// Abaixo de sm vira tela cheia (sem bordas flutuantes/raio), mesmo
					// padrão do EditRoomPreviewModal (Dashboard) — telas pequenas não
					// têm espaço sobrando pra margem/raio ao redor.
					"max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-dvh max-sm:max-w-none max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none",
				)}
			>
				{isLoadingDevice ? (
					<EditDeviceModalSkeleton />
				) : isDeviceError && !device ? (
					<EditDeviceModalErrorFallback
						onRetry={() => refetchDevice()}
						onClose={closeEditModal}
					/>
				) : !device ? (
					<EditDeviceModalSkeleton />
				) : (
					<FormProvider {...formMethods}>
						<form
							noValidate
							onSubmit={handleSubmit(onSubmit)}
							className="flex max-h-full flex-col sm:max-h-[85vh]"
						>
							{/* Cabeçalho do Modal */}
							<div className="flex items-start gap-4 border-b border-border-subtle/60 bg-surface-low/30 p-6 pb-4">
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-high text-primary shadow-xs">
									<Sliders className="h-5 w-5" />
								</span>

								<DialogHeader className="flex-1 gap-1 text-left">
									<DialogTitle className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-foreground">
										{t("form.edit.title")}
										{isDeviceError && <StaleDataIndicator />}
									</DialogTitle>
									<DialogDescription className="text-xs leading-relaxed text-muted-foreground">
										{t("form.edit.description")}
									</DialogDescription>

									<div className="mt-2 flex items-center gap-2">
										<span
											className={cn(
												"inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold shadow-xs",
												device.isOnline
													? "border-primary/30 bg-primary/15 text-primary"
													: "border-destructive/30 bg-destructive/10 text-destructive",
											)}
										>
											<span
												className={cn(
													"h-1.5 w-1.5 rounded-full",
													device.isOnline ? "bg-primary" : "bg-destructive",
												)}
											/>
											{device.isOnline
												? t("common:status.online")
												: t("common:status.offline")}
										</span>

										<span className="inline-flex h-6 items-center rounded-full border border-border-subtle bg-surface-low px-2.5 text-[11px] font-medium text-muted-foreground shadow-xs">
											{device.brand}
										</span>
									</div>
								</DialogHeader>
							</div>

							{/* Corpo do Formulário */}
							<div className="flex-1 overflow-y-auto p-6 scrollbar-gutter-stable scrollbar-thin">
								<div className="flex flex-col gap-4">
									<FormGlobalError error={updateError?.message} />

									<EditDeviceGeneralTab />

									<EditDeviceAdvancedSection
										isOpen={isAdvancedOpen}
										onToggle={() => setIsAdvancedOpen((prev) => !prev)}
									/>
								</div>
							</div>

							{/* Rodapé de Ações */}
							<div className="flex items-center justify-between border-t border-border-subtle/60 bg-surface-low/50 px-6 py-3.5">
								<button
									type="button"
									onClick={handleDeleteClick}
									disabled={isBusy}
									className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 text-xs font-semibold text-destructive transition-all hover:border-destructive/50 hover:bg-destructive/20 disabled:opacity-50 cursor-pointer shadow-xs"
								>
									<Trash2 className="h-3.5 w-3.5" />
									{t("form.edit.deleteButton")}
								</button>

								<div className="flex items-center gap-2.5">
									<button
										type="button"
										onClick={closeEditModal}
										disabled={isBusy}
										className="h-8.5 rounded-lg border border-border-subtle bg-surface-container px-3.5 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-surface-high hover:text-foreground disabled:opacity-50 cursor-pointer shadow-xs"
									>
										{t("common:actions.cancel")}
									</button>
									<button
										type="submit"
										disabled={isBusy}
										className="inline-flex h-8.5 items-center gap-2 rounded-lg border border-border bg-surface-high px-4 text-xs font-semibold text-foreground transition-all hover:border-foreground/30 hover:bg-surface-highest disabled:opacity-50 cursor-pointer shadow-xs active:scale-[0.98]"
									>
										{isUpdating && (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										)}
										{t("form.edit.saveButton")}
									</button>
								</div>
							</div>
						</form>
					</FormProvider>
				)}
			</DialogContent>
		</Dialog>
	);
};
