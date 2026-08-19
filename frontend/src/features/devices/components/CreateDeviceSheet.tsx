import { zodResolver } from "@hookform/resolvers/zod";
import {
	BadgeInfo,
	Cpu,
	Home,
	KeyRound,
	Layers,
	Loader2,
	MapPin,
	Network,
	Plug,
	QrCode,
	Router,
	Sliders,
	Wifi,
} from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { formatIpAddress, formatMacAddress } from "@/core/utils/formatters";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { INTEGRATION_FIELD_VISIBILITY } from "../constants/devices.constants";
import { useCreateDevice } from "../hooks/useCreateDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type CreateDeviceFormInput,
	type CreateDeviceFormOutput,
	createDeviceSchema,
} from "../types/device.schemas";
import {
	DEVICE_TYPE_LABEL_KEYS,
	DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	IntegrationTypeEnum,
} from "../types/devices.types";

export const CreateDeviceSheet: React.FC = () => {
	const { t } = useTranslation(["devices", "common"]);
	const { isCreateSheetOpen, closeCreateSheet } = useDevicesUIStore();
	const {
		mutate: createDevice,
		isPending,
		error: mutationError,
	} = useCreateDevice();
	const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();

	const {
		register,
		control,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = useForm<CreateDeviceFormInput, undefined, CreateDeviceFormOutput>({
		resolver: zodResolver(createDeviceSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: {
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
		},
	});

	const selectedIntegration = useWatch({ control, name: "integrationType" }) as
		| IntegrationTypeEnum
		| undefined;
	const fieldVisibility =
		INTEGRATION_FIELD_VISIBILITY[
			selectedIntegration || IntegrationTypeEnum.NativeMqtt
		];

	useEffect(() => {
		if (isCreateSheetOpen) {
			setFocus("name");
		} else {
			reset();
		}
	}, [isCreateSheetOpen, reset, setFocus]);

	const onSubmit = (data: CreateDeviceFormOutput) => {
		createDevice(data, {
			onSuccess: () => {
				reset();
				closeCreateSheet();
			},
		});
	};

	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABEL_KEYS).map(
		([value, labelKey]) => ({
			value: Number(value),
			label: t(labelKey),
		}),
	);

	const integrationTypeOptions = Object.entries(
		INTEGRATION_TYPE_LABEL_KEYS,
	).map(([value, labelKey]) => ({
		value: Number(value),
		label: t(labelKey),
	}));

	const roomOptions = [
		{ value: "", label: t("form.fields.room.none") },
		...rooms.map((room) => ({
			value: room.id,
			label: room.name,
		})),
	];

	return (
		<SheetLayout
			isOpen={isCreateSheetOpen}
			onClose={closeCreateSheet}
			onSubmit={handleSubmit(onSubmit)}
			title={t("form.create.title")}
			description={t("form.create.description")}
			footer={
				<>
					<button
						type="button"
						onClick={closeCreateSheet}
						disabled={isPending}
						className="rounded-md border border-[#27272a] bg-transparent px-4 py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:border-[#52525b] disabled:opacity-50 cursor-pointer"
					>
						{t("common:actions.cancel")}
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-[#6366f1] px-6 py-2 text-xs font-medium text-white transition-all hover:bg-[#4f46e5] hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] disabled:opacity-50 cursor-pointer group"
					>
						{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						<span className="relative z-10">
							{t("common:actions.register")}
						</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			{/* Container principal estruturado com space-y-4 e respiro proporcional */}
			<div className="space-y-4">
				<FormGlobalError error={mutationError?.message} />

				{/* SEÇÃO 1: Identificação */}
				<div className="space-y-2.5">
					<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
						<BadgeInfo className="h-3.5 w-3.5" />
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t("form.sections.identification")}
						</span>
					</div>

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
				</div>

				{/* SEÇÃO 2: Rede & Conectividade */}
				<div className="space-y-2.5 pt-1">
					<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
						<Router className="h-3.5 w-3.5" />
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t("form.sections.network")}
						</span>
					</div>

					<FormInput
						id="externalId"
						label={t("form.fields.externalId.label")}
						placeholder={t("form.fields.externalId.placeholder")}
						icon={<QrCode className="h-4 w-4" />}
						error={errors.externalId?.message}
						registration={register("externalId")}
						mask={formatMacAddress}
						maxLength={17}
						className="font-mono"
					/>

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

				{/* SEÇÃO 3: Classificação */}
				<div className="space-y-2.5 pt-1">
					<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
						<MapPin className="h-3.5 w-3.5" />
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t("form.sections.classification")}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

						<FormSelect
							id="integrationType"
							name="integrationType"
							control={control}
							label={t("form.fields.integrationType.label")}
							placeholder={t("form.fields.integrationType.placeholder")}
							icon={<Router className="h-4 w-4" />}
							error={errors.integrationType?.message}
							options={integrationTypeOptions}
						/>

						<div className="sm:col-span-2">
							<FormSelect
								id="roomId"
								name="roomId"
								control={control}
								label={t("form.fields.room.label")}
								placeholder={
									isLoadingRooms
										? t("form.fields.room.loading")
										: t("form.fields.room.placeholder")
								}
								icon={<Home className="h-4 w-4" />}
								error={errors.roomId?.message}
								options={roomOptions}
								disabled={isLoadingRooms}
							/>
						</div>
					</div>
				</div>
			</div>
		</SheetLayout>
	);
};
