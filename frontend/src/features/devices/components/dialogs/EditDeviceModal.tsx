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
import { Trans, useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
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
import { INTEGRATION_FIELD_VISIBILITY } from "../../constants/devices.constants";
import { useDeleteDevice } from "../../hooks/useDeleteDevice";
import { useDevice } from "../../hooks/useDevice";
import { useUpdateDevice } from "../../hooks/useUpdateDevice";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import {
	type UpdateDeviceFormInput,
	type UpdateDeviceFormOutput,
	updateDeviceSchema,
} from "../../types/device.schemas";
import {
	DEVICE_TYPE_LABEL_KEYS,
	type DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	IntegrationTypeEnum,
} from "../../types/devices.types";
import { TvSetupGuideCallout } from "./TvSetupGuideCallout";
import { cn } from "@/core/utils";

export const EditDeviceModal: React.FC = () => {
	const { t } = useTranslation(["devices", "common"]);
	const editingDevice = useDevicesUIStore((s) => s.editingDevice);
	const closeEditModal = useDevicesUIStore((s) => s.closeEditModal);
	const isOpen = Boolean(editingDevice);
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
	const confirm = useConfirm();

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

	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABEL_KEYS).map(
		([value, labelKey]) => ({
			value: Number(value),
			label: t(labelKey),
		}),
	);

	const isBusy = isUpdating || isLoadingDevice || isDeleting;

	return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) closeEditModal();
            }}
        >
            <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-border-subtle bg-surface-container p-0 text-foreground shadow-2xl sm:max-w-2xl">
                {isLoadingDevice || !device ? (
                    <div className="flex h-72 flex-col items-center justify-center gap-2.5 p-6 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs font-medium">{t("form.edit.loading")}</span>
                    </div>
                ) : (
                    <form
                        noValidate
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex max-h-[85vh] flex-col"
                    >
                        {/* Cabeçalho do Modal */}
                        <div className="flex items-start gap-4 border-b border-border-subtle/60 bg-surface-low/30 p-6 pb-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-high text-primary shadow-xs">
                                <Sliders className="h-5 w-5" />
                            </span>

                            <DialogHeader className="flex-1 gap-1 text-left">
                                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                                    {t("form.edit.title")}
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

                                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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

                                {/* Tipo de Integração via Tabs */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                                        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border-subtle bg-surface-low p-1 shadow-xs">
                                            {Object.entries(INTEGRATION_TYPE_LABEL_KEYS).map(
                                                ([value, labelKey]) => (
                                                    <TabsTrigger
                                                        key={value}
                                                        value={value}
                                                        className="rounded-lg text-xs font-medium data-[state=active]:border data-[state=active]:border-border-subtle data-[state=active]:bg-surface-high data-[state=active]:text-foreground data-[state=active]:shadow-xs"
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

                                {/* Seletor de Ambiente em Pills */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Home className="h-3.5 w-3.5" />
                                        {t("form.fields.room.label")}
                                    </span>
                                    <fieldset className="m-0 flex flex-wrap items-center gap-1.5 border-0 p-0">
                                        <legend className="sr-only">
                                            {t("form.fields.room.label")}
                                        </legend>
                                        <button
                                            type="button"
                                            aria-pressed={!selectedRoomId}
                                            onClick={() =>
                                                setValue("roomId", "", { shouldValidate: true })
                                            }
                                            className={cn(
                                                "h-7.5 shrink-0 rounded-lg px-3 text-xs transition-all cursor-pointer shadow-xs",
                                                !selectedRoomId
                                                    ? "border border-primary/40 bg-primary/20 font-semibold text-primary ring-1 ring-primary/30"
                                                    : "border border-border-subtle bg-surface-low font-medium text-muted-foreground hover:border-border hover:bg-surface-high hover:text-foreground",
                                            )}
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
                                                    className={cn(
                                                        "h-7.5 shrink-0 rounded-lg px-3 text-xs transition-all cursor-pointer shadow-xs",
                                                        isSelected
                                                            ? "border border-primary/40 bg-primary/20 font-semibold text-primary ring-1 ring-primary/30"
                                                            : "border border-border-subtle bg-surface-low font-medium text-muted-foreground hover:border-border hover:bg-surface-high hover:text-foreground",
                                                    )}
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

                                {/* Accordion de Configurações Avançadas */}
                                <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-low/40 shadow-xs">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdvancedOpen((prev) => !prev)}
                                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground cursor-pointer"
                                    >
                                        <span>{t("form.edit.advancedSettings")}</span>
                                        <ChevronDown
                                            className={cn(
                                                "h-4 w-4 transition-transform duration-200",
                                                isAdvancedOpen && "rotate-180 text-foreground",
                                            )}
                                        />
                                    </button>

                                    {isAdvancedOpen && (
                                        <div className="space-y-3.5 border-t border-border-subtle/60 bg-surface-low p-4 animate-fade-in">
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
                                                    placeholder={t("form.fields.macAddress.placeholder")}
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
                                                    placeholder={t("form.fields.dpsPowerKey.placeholder")}
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
                )}
            </DialogContent>
        </Dialog>
    );
};
