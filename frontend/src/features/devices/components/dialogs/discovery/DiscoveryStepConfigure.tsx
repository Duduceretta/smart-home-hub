import { zodResolver } from "@hookform/resolvers/zod";
import {
	ChevronDown,
	Cpu,
	Home,
	KeyRound,
	Layers,
	Network,
	Plug,
	QrCode,
	Sliders,
	Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { formatIpAddress, formatMacAddress } from "@/core/utils/formatters";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { INTEGRATION_FIELD_VISIBILITY } from "../../../constants/devices.constants";
import { useDevicesUIStore } from "../../../store/devices-ui.store";
import {
	type CreateDeviceFormInput,
	type CreateDeviceFormOutput,
	createDeviceSchema,
} from "../../../types/device.schemas";
import {
	DEVICE_TYPE_LABEL_KEYS,
	DeviceTypeEnum,
	type DiscoveredDevice,
	INTEGRATION_TYPE_LABEL_KEYS,
	IntegrationTypeEnum,
} from "../../../types/devices.types";
import { TvSetupGuideCallout } from "../TvSetupGuideCallout";
import { cn } from "@/core/utils";

const EMPTY_DEFAULTS: CreateDeviceFormInput = {
	name: "",
	brand: "",
	externalId: "",
	ipAddress: "",
	type: DeviceTypeEnum.Light,
	integrationType: IntegrationTypeEnum.NativeMqtt,
	roomId: "",
	macAddress: "",
	localKey: "",
	protocolVersion: "",
	dpsPowerKey: "",
	clientKey: "",
};

function mapDiscoveredDeviceToFormDefaults(
	device: DiscoveredDevice,
): CreateDeviceFormInput {
	return {
		name: device.name,
		brand: device.brand,
		externalId: device.externalId,
		ipAddress: device.ipAddress ?? "",
		type: device.type,
		integrationType: device.integrationType,
		roomId: "",
		macAddress: device.macAddress ?? "",
		localKey: "",
		// Preenchido automaticamente quando o próprio broadcast do dispositivo já
		// indica a versão do protocolo Tuya (discovery v3.4/v3.5) — evita a detecção
		// manual que foi necessária pra lâmpada de teste antes desse suporte existir.
		protocolVersion: device.additionalProperties?.tuya_protocol_version ?? "",
		dpsPowerKey: "",
		clientKey: "",
	};
}

export const DiscoveryStepConfigure: React.FC = () => {
	const { t } = useTranslation(["devices", "common"]);
	const selectedDiscoveredDevice = useDevicesUIStore(
		(s) => s.selectedDiscoveredDevice,
	);
	const setDiscoveryStep = useDevicesUIStore((s) => s.setDiscoveryStep);
	const setPendingDevicePayload = useDevicesUIStore(
		(s) => s.setPendingDevicePayload,
	);
	const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

	const {
		register,
		control,
		handleSubmit,
		reset,
		setValue,
		formState: { errors },
	} = useForm<CreateDeviceFormInput, undefined, CreateDeviceFormOutput>({
		resolver: zodResolver(createDeviceSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: selectedDiscoveredDevice
			? mapDiscoveredDeviceToFormDefaults(selectedDiscoveredDevice)
			: EMPTY_DEFAULTS,
	});

	useEffect(() => {
		reset(
			selectedDiscoveredDevice
				? mapDiscoveredDeviceToFormDefaults(selectedDiscoveredDevice)
				: EMPTY_DEFAULTS,
		);
	}, [selectedDiscoveredDevice, reset]);

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

	const onSubmit = (data: CreateDeviceFormOutput) => {
		setPendingDevicePayload(data);
	};

	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABEL_KEYS).map(
		([value, labelKey]) => ({
			value: Number(value),
			label: t(labelKey),
		}),
	);

	return (
        <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4"
        >
            {/* Callout de Pré-preenchimento */}
            {selectedDiscoveredDevice && (
                <div className="rounded-xl border border-border-subtle bg-surface-low px-3.5 py-2.5 text-xs text-muted-foreground shadow-xs">
                    {t("discoveryModal.configure.prefillNotice")}
                </div>
            )}

            {/* Campos Principais em Grid */}
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

            {/* Tipo de Integração via Tabs / Segmented Control */}
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("form.fields.integrationType.label")}
                </span>
                <Tabs
                    value={String(selectedIntegration ?? IntegrationTypeEnum.NativeMqtt)}
                    onValueChange={(value) =>
                        setValue("integrationType", Number(value) as IntegrationTypeEnum, {
                            shouldValidate: true,
                        })
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

            {/* Guia contextual de configuração */}
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
                    <legend className="sr-only">{t("form.fields.room.label")}</legend>
                    <button
                        type="button"
                        aria-pressed={!selectedRoomId}
                        onClick={() => setValue("roomId", "", { shouldValidate: true })}
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
                                    setValue("roomId", room.id, { shouldValidate: true })
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
                    <span>{t("discoveryModal.configure.advancedSettings")}</span>
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
                                placeholder={t("form.fields.localKey.placeholder")}
                                icon={<KeyRound className="h-4 w-4" />}
                                error={errors.localKey?.message}
                                registration={register("localKey")}
                            />
                        )}

                        {fieldVisibility.showProtocolVersion && (
                            <FormInput
                                id="protocolVersion"
                                label={t("form.fields.protocolVersion.label")}
                                placeholder={t("form.fields.protocolVersion.placeholder")}
                                icon={<KeyRound className="h-4 w-4" />}
                                error={errors.protocolVersion?.message}
                                registration={register("protocolVersion")}
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
                                placeholder={t("form.fields.clientKey.placeholder")}
                                icon={<KeyRound className="h-4 w-4" />}
                                error={errors.clientKey?.message}
                                registration={register("clientKey")}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Rodapé: Navegação do Stepper */}
            <div className="mt-auto flex items-center justify-between border-t border-border-subtle/60 pt-4">
                <button
                    type="button"
                    onClick={() => setDiscoveryStep("scan")}
                    className="h-8.5 rounded-lg border border-border-subtle bg-surface-container px-3.5 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-surface-high hover:text-foreground cursor-pointer shadow-xs"
                >
                    {t("discoveryModal.configure.backButton")}
                </button>
                <button
                    type="submit"
                    className="inline-flex h-8.5 items-center justify-center rounded-lg border border-border bg-surface-high px-4 text-xs font-semibold text-foreground transition-all hover:border-foreground/30 hover:bg-surface-highest cursor-pointer shadow-xs active:scale-[0.98]"
                >
                    {t("discoveryModal.configure.reviewButton")}
                </button>
            </div>
        </form>
    );
};
