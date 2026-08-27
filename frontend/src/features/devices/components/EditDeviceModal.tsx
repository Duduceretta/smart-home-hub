import { zodResolver } from "@hookform/resolvers/zod";
import {
	ChevronDown,
	Cpu,
	Home,
	KeyRound,
	Layers,
	Loader2,
	Network,
	Plug,
	QrCode,
	Sliders,
	Trash2,
	Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { DeleteDeviceModal } from "@/core/components/modals/DeleteDeviceModal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { formatIpAddress, formatMacAddress } from "@/core/utils/formatters";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { INTEGRATION_FIELD_VISIBILITY } from "../constants/devices.constants";
import { useDeleteDevice } from "../hooks/useDeleteDevice";
import { useDevice } from "../hooks/useDevice";
import { useUpdateDevice } from "../hooks/useUpdateDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type UpdateDeviceFormInput,
	type UpdateDeviceFormOutput,
	updateDeviceSchema,
} from "../types/device.schemas";
import {
	DEVICE_TYPE_LABEL_KEYS,
	type DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	IntegrationTypeEnum,
} from "../types/devices.types";
import { TvSetupGuideCallout } from "./TvSetupGuideCallout";

export const EditDeviceModal: React.FC = () => {
	const { t } = useTranslation(["devices", "common"]);
	const editingDevice = useDevicesUIStore((s) => s.editingDevice);
	const closeEditModal = useDevicesUIStore((s) => s.closeEditModal);
	const isOpen = Boolean(editingDevice);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

	const { data: device, isLoading: isLoadingDevice } = useDevice(
		editingDevice?.id ?? "",
	);
	const {
		mutate: updateDevice,
		isPending: isUpdating,
		error: updateError,
	} = useUpdateDevice();
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();
	const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();

	const {
		register,
		control,
		handleSubmit,
		reset,
		setValue,
		formState: { errors },
	} = useForm<UpdateDeviceFormInput, undefined, UpdateDeviceFormOutput>({
		resolver: zodResolver(updateDeviceSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
	});

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
				dpsPowerKey: "",
				clientKey: "",
			});
		}
	}, [device, reset]);

	useEffect(() => {
		if (!isOpen) {
			reset();
			setIsAdvancedOpen(false);
		}
	}, [isOpen, reset]);

	const selectedIntegration = useWatch({ control, name: "integrationType" }) as
		| IntegrationTypeEnum
		| undefined;
	const selectedRoomId = useWatch({ control, name: "roomId" }) as
		| string
		| null
		| undefined;
	const selectedType = useWatch({ control, name: "type" }) as
		| DeviceTypeEnum
		| undefined;
	const fieldVisibility =
		INTEGRATION_FIELD_VISIBILITY[
			selectedIntegration || IntegrationTypeEnum.NativeMqtt
		];

	const onSubmit = (data: UpdateDeviceFormOutput) => {
		if (!editingDevice?.id) return;

		updateDevice(
			{ id: editingDevice.id, payload: data },
			{ onSuccess: () => closeEditModal() },
		);
	};

	const handleDeleteConfirm = () => {
		if (!editingDevice?.id) return;

		deleteDevice(editingDevice.id, {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				closeEditModal();
			},
		});
	};

	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABEL_KEYS).map(
		([value, labelKey]) => ({
			value: Number(value),
			label: t(labelKey),
		}),
	);

	const isBusy = isUpdating || isLoadingDevice;

	return (
		<>
			<Dialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) closeEditModal();
				}}
			>
				<DialogContent
					className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
					// O DeleteDeviceModal é um portal fora da árvore do DialogContent, então
					// o Radix trataria cliques nele (backdrop, Cancelar) como "fora" deste
					// Dialog e o fecharia também. Checamos o DOM real do evento em vez do
					// estado `isDeleteModalOpen` porque o próprio clique que fecha a
					// confirmação já pode ter atualizado esse estado (React re-render) antes
					// deste handler rodar — o nó `[data-delete-confirm-modal]`, porém, ainda
					// está fisicamente no DOM nesse instante, então é uma checagem confiável.
					onPointerDownOutside={(event) => {
						if (
							event.target instanceof Element &&
							event.target.closest("[data-delete-confirm-modal]")
						) {
							event.preventDefault();
						}
					}}
				>
					{isLoadingDevice || !device ? (
						<div className="flex h-72 flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
							<span className="text-xs">{t("form.edit.loading")}</span>
						</div>
					) : (
						<form
							noValidate
							onSubmit={handleSubmit(onSubmit)}
							className="flex max-h-[85vh] flex-col"
						>
							<div className="flex items-start gap-4 border-b border-border-subtle/20 p-6 pb-4">
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-surface-high to-surface-container text-primary ring-1 ring-border-subtle/30">
									<Sliders className="h-5 w-5" />
								</span>
								<DialogHeader className="flex-1 gap-1">
									<DialogTitle className="text-lg">
										{t("form.edit.title")}
									</DialogTitle>
									<DialogDescription className="text-xs">
										{t("form.edit.description")}
									</DialogDescription>
									<div className="mt-1 flex items-center gap-2">
										<span
											className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
												device.isOnline
													? "bg-primary/15 text-primary"
													: "bg-alert/20 text-alert-foreground"
											}`}
										>
											<span
												className={`h-1.5 w-1.5 rounded-full ${
													device.isOnline ? "bg-primary" : "bg-alert-foreground"
												}`}
											/>
											{device.isOnline
												? t("common:status.online")
												: t("common:status.offline")}
										</span>
										<span className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-muted-foreground">
											{device.brand}
										</span>
									</div>
								</DialogHeader>
							</div>

							<div className="flex-1 overflow-y-auto p-6">
								<div className="flex flex-col gap-4">
									<FormGlobalError error={updateError?.message} />

									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<FormInput
											id="name"
											label={t("form.fields.name.label")}
											placeholder={t("form.fields.name.placeholder")}
											icon={<Cpu className="h-4 w-4" />}
											error={errors.name?.message}
											registration={register("name")}
										/>

										<FormInput
											id="brand"
											label={t("form.fields.brand.label")}
											placeholder={t("form.fields.brand.placeholder")}
											icon={<Layers className="h-4 w-4" />}
											error={errors.brand?.message}
											registration={register("brand")}
										/>

										<FormInput
											id="externalId"
											label={t("form.fields.externalId.label")}
											placeholder={t("form.fields.externalId.placeholder")}
											icon={<QrCode className="h-4 w-4" />}
											error={errors.externalId?.message}
											registration={register("externalId")}
											className="font-mono"
										/>

										<FormSelect
											id="type"
											name="type"
											control={control}
											label={t("form.fields.type.label")}
											placeholder={t("form.fields.type.placeholder")}
											icon={<Sliders className="h-4 w-4" />}
											error={errors.type?.message}
											options={deviceTypeOptions}
										/>
									</div>

									<div className="flex flex-col gap-1.5">
										<span className="text-xs font-medium text-muted-foreground">
											{t("form.fields.integrationType.label")}
										</span>
										<Tabs
											value={String(
												selectedIntegration ?? IntegrationTypeEnum.NativeMqtt,
											)}
											onValueChange={(value) =>
												setValue(
													"integrationType",
													Number(value) as IntegrationTypeEnum,
													{ shouldValidate: true },
												)
											}
										>
											<TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface-container p-1">
												{Object.entries(INTEGRATION_TYPE_LABEL_KEYS).map(
													([value, labelKey]) => (
														<TabsTrigger
															key={value}
															value={value}
															className="text-xs"
														>
															{t(labelKey)}
														</TabsTrigger>
													),
												)}
											</TabsList>
										</Tabs>
									</div>

									<TvSetupGuideCallout
										integrationType={selectedIntegration}
										deviceType={selectedType}
									/>

									<div className="flex flex-col gap-1.5">
										<span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
											<Home className="h-3.5 w-3.5" />
											{t("form.fields.room.label")}
										</span>
										<fieldset className="flex flex-wrap items-center gap-2 border-0 p-0 m-0">
											<legend className="sr-only">
												{t("form.fields.room.label")}
											</legend>
											<button
												type="button"
												aria-pressed={!selectedRoomId}
												onClick={() =>
													setValue("roomId", "", { shouldValidate: true })
												}
												className={`shrink-0 rounded-full h-8 px-4 text-xs font-medium transition-all ${
													!selectedRoomId
														? "bg-primary/20 text-primary ring-1 ring-primary/50"
														: "bg-surface-container text-muted-foreground hover:bg-surface-high hover:text-foreground"
												}`}
											>
												{t("form.fields.room.none")}
											</button>
											{rooms.map((room) => {
												const isSelected = selectedRoomId === room.id;
												return (
													<button
														key={room.id}
														type="button"
														aria-pressed={isSelected}
														onClick={() =>
															setValue("roomId", room.id, {
																shouldValidate: true,
															})
														}
														className={`shrink-0 rounded-full h-8 px-4 text-xs font-medium transition-all ${
															isSelected
																? "bg-primary/20 text-primary ring-1 ring-primary/50"
																: "bg-surface-container text-muted-foreground hover:bg-surface-high hover:text-foreground"
														}`}
													>
														{room.name}
													</button>
												);
											})}
											{isLoadingRooms && (
												<span className="text-xs text-muted-foreground">
													{t("form.fields.room.loading")}
												</span>
											)}
										</fieldset>
									</div>

									<div className="rounded-lg border border-border-subtle/30">
										<button
											type="button"
											onClick={() => setIsAdvancedOpen((prev) => !prev)}
											className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer"
										>
											{t("form.edit.advancedSettings")}
											<ChevronDown
												className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`}
											/>
										</button>

										{isAdvancedOpen && (
											<div className="space-y-3 border-t border-border-subtle/30 p-4">
												{fieldVisibility.showIp && (
													<FormInput
														id="ipAddress"
														label={
															fieldVisibility.requireIpOnCreate
																? t("form.fields.ipAddress.labelRequired")
																: t("form.fields.ipAddress.label")
														}
														placeholder={t("form.fields.ipAddress.placeholder")}
														icon={<Network className="h-4 w-4" />}
														error={errors.ipAddress?.message}
														registration={register("ipAddress")}
														mask={formatIpAddress}
														maxLength={15}
														className="font-mono"
													/>
												)}

												{fieldVisibility.showMac && (
													<FormInput
														id="macAddress"
														label={t("form.fields.macAddress.label")}
														placeholder={t(
															"form.fields.macAddress.placeholder",
														)}
														icon={<Wifi className="h-4 w-4" />}
														error={errors.macAddress?.message}
														registration={register("macAddress")}
														mask={formatMacAddress}
														maxLength={17}
														className="font-mono"
													/>
												)}

												{fieldVisibility.showLocalKey && (
													<FormInput
														id="localKey"
														label={t("form.fields.localKey.label")}
														placeholder={t("form.fields.localKey.editHint")}
														icon={<KeyRound className="h-4 w-4" />}
														error={errors.localKey?.message}
														registration={register("localKey")}
													/>
												)}

												{fieldVisibility.showDpsPowerKey && (
													<FormInput
														id="dpsPowerKey"
														label={t("form.fields.dpsPowerKey.label")}
														placeholder={t(
															"form.fields.dpsPowerKey.placeholder",
														)}
														icon={<Plug className="h-4 w-4" />}
														error={errors.dpsPowerKey?.message}
														registration={register("dpsPowerKey")}
													/>
												)}

												{fieldVisibility.showClientKey && (
													<FormInput
														id="clientKey"
														label={t("form.fields.clientKey.label")}
														placeholder={t("form.fields.clientKey.editHint")}
														icon={<KeyRound className="h-4 w-4" />}
														error={errors.clientKey?.message}
														registration={register("clientKey")}
													/>
												)}
											</div>
										)}
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between border-t border-border-subtle/20 bg-surface-low p-4">
								<button
									type="button"
									onClick={() => setIsDeleteModalOpen(true)}
									disabled={isBusy}
									className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-alert-foreground transition-colors hover:bg-alert/10 disabled:opacity-50 cursor-pointer"
								>
									<Trash2 className="h-3.5 w-3.5" />
									{t("form.edit.deleteButton")}
								</button>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={closeEditModal}
										disabled={isBusy}
										className="rounded-md border border-border-subtle/40 bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border-subtle disabled:opacity-50 cursor-pointer"
									>
										{t("common:actions.cancel")}
									</button>
									<button
										type="submit"
										disabled={isBusy}
										className="inline-flex items-center gap-2 rounded-full border border-border-subtle/30 bg-surface-high px-6 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-highest disabled:opacity-50 cursor-pointer active:scale-[0.98]"
									>
										{isUpdating && (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										)}
										{t("form.edit.saveButton")}
									</button>
								</div>
							</div>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<DeleteDeviceModal
				isOpen={isDeleteModalOpen}
				deviceName={device?.name ?? ""}
				onClose={() => setIsDeleteModalOpen(false)}
				isLoading={isDeleting}
				onConfirm={handleDeleteConfirm}
			/>
		</>
	);
};
