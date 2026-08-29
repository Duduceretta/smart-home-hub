import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DeviceTypeEnum, IntegrationTypeEnum } from "../../types/devices.types";

const TV_MEDIA_INTEGRATIONS: IntegrationTypeEnum[] = [
	IntegrationTypeEnum.GoogleCast,
	IntegrationTypeEnum.AndroidTvAdb,
	IntegrationTypeEnum.LgWebOs,
];

interface TvSetupGuideCalloutProps {
	integrationType?: IntegrationTypeEnum;
	deviceType?: DeviceTypeEnum;
}

export const TvSetupGuideCallout: React.FC<TvSetupGuideCalloutProps> = ({
	integrationType,
	deviceType,
}) => {
	const { t } = useTranslation("devices");

	const isTvIntegration =
		integrationType != null && TV_MEDIA_INTEGRATIONS.includes(integrationType);

	if (!isTvIntegration && deviceType !== DeviceTypeEnum.Television) {
		return null;
	}

	return (
		<div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
			<p className="flex items-center gap-1.5 font-medium">
				<Info className="h-3.5 w-3.5" />
				{t("tvSetupGuide.title")}
			</p>
			<ul className="mt-1.5 list-disc space-y-0.5 pl-4">
				<li>{t("tvSetupGuide.quickStart")}</li>
				<li>{t("tvSetupGuide.wakeOnLan")}</li>
				<li>{t("tvSetupGuide.networkDebugging")}</li>
			</ul>
		</div>
	);
};
