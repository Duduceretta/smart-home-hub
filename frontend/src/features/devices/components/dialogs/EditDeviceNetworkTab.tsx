import { Network, Wifi } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/core/components/forms/FormInput";
import { formatIpAddress, formatMacAddress } from "@/core/utils/formatters";
import { INTEGRATION_FIELD_VISIBILITY } from "../../constants/devices.constants";
import type { UpdateDeviceFormInput } from "../../types/device.schemas";
import { IntegrationTypeEnum } from "../../types/devices.types";

/**
 * Network fields (IP/MAC) inside `EditDeviceModal`'s advanced section.
 * Visibility of each field depends on the currently selected integration
 * type (`INTEGRATION_FIELD_VISIBILITY`) — reads the shared form via
 * `useFormContext`, never its own state.
 */
export function EditDeviceNetworkTab() {
	const { t } = useTranslation(["devices", "common"]);
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<UpdateDeviceFormInput>();

	const selectedIntegration = useWatch({ control, name: "integrationType" }) as
		| IntegrationTypeEnum
		| undefined;
	const fieldVisibility =
		INTEGRATION_FIELD_VISIBILITY[
			selectedIntegration || IntegrationTypeEnum.NativeMqtt
		];

	return (
		<>
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
		</>
	);
}
