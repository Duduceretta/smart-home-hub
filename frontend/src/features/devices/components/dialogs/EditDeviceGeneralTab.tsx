import { Cpu, Home, Layers, QrCode, Sliders } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { useRoomLookup } from "@/core/hooks/useRoomLookup";
import { cn } from "@/core/utils";
import type { UpdateDeviceFormInput } from "../../types/device.schemas";
import {
	DEVICE_TYPE_LABEL_KEYS,
	type DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	IntegrationTypeEnum,
} from "../../types/devices.types";
import { TvSetupGuideCallout } from "./TvSetupGuideCallout";

/**
 * "General" section of `EditDeviceModal`: identification fields, the
 * integration-type picker, the TV setup callout that reacts to it, and the
 * room assignment. Reads/writes the shared form via `useFormContext` — the
 * modal owns the single `useForm` instance, this component never creates
 * its own state.
 */
export function EditDeviceGeneralTab() {
	const { t } = useTranslation(["devices", "common"]);
	const {
		register,
		control,
		setValue,
		formState: { errors },
	} = useFormContext<UpdateDeviceFormInput>();

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

	const { data: rooms = [], isLoading: isLoadingRooms } = useRoomLookup();

	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABEL_KEYS).map(
		([value, labelKey]) => ({
			value: Number(value),
			label: t(labelKey),
		}),
	);

	return (
		<>
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
						<span
							role="status"
							aria-label={t("form.fields.room.loading")}
							className="h-3 w-3 shrink-0 rounded-full bg-surface-high animate-pulse"
						/>
					)}
				</fieldset>
			</div>
		</>
	);
}
