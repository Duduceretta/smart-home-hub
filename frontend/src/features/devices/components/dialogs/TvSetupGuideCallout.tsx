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
        <div className="rounded-xl border border-warm/25 bg-warm/10 p-3.5 text-xs text-foreground shadow-xs">
            <p className="flex items-center gap-2 font-semibold tracking-tight text-warm-foreground">
                <Info className="h-4 w-4 shrink-0 text-warm-foreground" />
                {t("tvSetupGuide.title")}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-muted-foreground marker:text-warm-foreground/60">
                <li>{t("tvSetupGuide.quickStart")}</li>
                <li>{t("tvSetupGuide.wakeOnLan")}</li>
                <li>{t("tvSetupGuide.networkDebugging")}</li>
            </ul>
        </div>
    );
};
