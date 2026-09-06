import { ChevronDown, KeyRound, Plug } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/core/components/forms/FormInput";
import { cn } from "@/core/utils";
import { INTEGRATION_FIELD_VISIBILITY } from "../../constants/devices.constants";
import type { UpdateDeviceFormInput } from "../../types/device.schemas";
import { DeviceTypeEnum, IntegrationTypeEnum } from "../../types/devices.types";
import { EditDeviceNetworkTab } from "./EditDeviceNetworkTab";

interface EditDeviceAdvancedSectionProps {
	isOpen: boolean;
	onToggle: () => void;
}

/**
 * Collapsible "Advanced settings" accordion of `EditDeviceModal`: network
 * fields (via `EditDeviceNetworkTab`), integration-specific credentials
 * (Tuya local key/protocol/dps power key, Google Cast client key), and the
 * color-support override for lights. Open/closed state is owned by the
 * modal (it needs to reset it back to closed when the dialog itself
 * closes) — everything else reads/writes the shared form via
 * `useFormContext`.
 */
export function EditDeviceAdvancedSection({
	isOpen,
	onToggle,
}: EditDeviceAdvancedSectionProps) {
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
	const selectedType = useWatch({ control, name: "type" }) as
		| DeviceTypeEnum
		| undefined;
	const selectedSupportsColor = useWatch({ control, name: "supportsColor" }) as
		| boolean
		| null
		| undefined;
	const fieldVisibility =
		INTEGRATION_FIELD_VISIBILITY[
			selectedIntegration || IntegrationTypeEnum.NativeMqtt
		];

	return (
		<div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-low/40 shadow-xs">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground cursor-pointer"
			>
				<span>{t("form.edit.advancedSettings")}</span>
				<ChevronDown
					className={cn(
						"h-4 w-4 transition-transform duration-200",
						isOpen && "rotate-180 text-foreground",
					)}
				/>
			</button>

			{isOpen && (
				<div className="space-y-3.5 border-t border-border-subtle/60 bg-surface-low p-4 animate-fade-in">
					<EditDeviceNetworkTab />

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

					{fieldVisibility.showProtocolVersion && (
						<FormInput
							id="protocolVersion"
							label={t("form.fields.protocolVersion.label")}
							placeholder={t("form.fields.protocolVersion.editHint")}
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
							placeholder={t("form.fields.clientKey.editHint")}
							icon={<KeyRound className="h-4 w-4" />}
							error={errors.clientKey?.message}
							registration={register("clientKey")}
						/>
					)}

					{selectedType === DeviceTypeEnum.Light && (
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{t("form.fields.supportsColor.label")}
							</span>
							{/* biome-ignore lint/a11y/useSemanticElements: segmented control de 3 opções, não um form <fieldset> */}
							<div
								role="group"
								aria-label={t("form.fields.supportsColor.label")}
								className="flex items-center gap-1.5"
							>
								{(
									[
										{
											value: null,
											label: t("form.fields.supportsColor.auto"),
										},
										{
											value: true,
											label: t("form.fields.supportsColor.yes"),
										},
										{
											value: false,
											label: t("form.fields.supportsColor.no"),
										},
									] as const
								).map((option) => {
									const isSelected =
										(selectedSupportsColor ?? null) === option.value;
									return (
										<button
											key={String(option.value)}
											type="button"
											aria-pressed={isSelected}
											onClick={() =>
												setValue("supportsColor", option.value, {
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
											{option.label}
										</button>
									);
								})}
							</div>
							<p className="text-xs text-muted-foreground/70">
								{t("form.fields.supportsColor.hint")}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
