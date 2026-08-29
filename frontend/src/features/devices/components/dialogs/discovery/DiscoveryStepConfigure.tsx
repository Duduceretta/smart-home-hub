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
			{selectedDiscoveredDevice && (
				<p className="rounded-md bg-surface-container px-3 py-2 text-xs text-muted-foreground">
					{t("discoveryModal.configure.prefillNotice")}
				</p>
			)}

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
					value={String(selectedIntegration ?? IntegrationTypeEnum.NativeMqtt)}
					onValueChange={(value) =>
						setValue("integrationType", Number(value) as IntegrationTypeEnum, {
							shouldValidate: true,
						})
					}
				>
					<TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface-container p-1">
						{Object.entries(INTEGRATION_TYPE_LABEL_KEYS).map(
							([value, labelKey]) => (
								<TabsTrigger key={value} value={value} className="text-xs">
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
					<legend className="sr-only">{t("form.fields.room.label")}</legend>
					<button
						type="button"
						aria-pressed={!selectedRoomId}
						onClick={() => setValue("roomId", "", { shouldValidate: true })}
						className={`shrink-0 h-8 rounded-full px-4 text-xs font-medium transition-all ${
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
									setValue("roomId", room.id, { shouldValidate: true })
								}
								className={`shrink-0 h-8 rounded-full px-4 text-xs font-medium transition-all ${
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

			<div className="rounded-lg border border-border-subtle/10">
				<button
					type="button"
					onClick={() => setIsAdvancedOpen((prev) => !prev)}
					className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer"
				>
					{t("discoveryModal.configure.advancedSettings")}
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

			<div className="mt-auto flex items-center justify-between border-t border-border-subtle/10 pt-4">
				<button
					type="button"
					onClick={() => setDiscoveryStep("scan")}
					className="rounded-md border border-border-subtle bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border-subtle cursor-pointer"
				>
					{t("discoveryModal.configure.backButton")}
				</button>
				<button
					type="submit"
					className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-high px-6 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-highest cursor-pointer active:scale-[0.98]"
				>
					{t("discoveryModal.configure.reviewButton")}
				</button>
			</div>
		</form>
	);
};
