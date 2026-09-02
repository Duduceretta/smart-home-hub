import { useTranslation } from "react-i18next";
import { SpotifyConnectCard } from "@/features/integrations/components/SpotifyConnectCard";
import { SpotifyNowPlayingCard } from "@/features/integrations/components/SpotifyNowPlayingCard";
import { LanguageSettingRow } from "@/features/settings/components/LanguageSettingRow";
import { ThemePresetSelector } from "@/features/settings/components/ThemePresetSelector";

export function SettingsPage() {
	const { t } = useTranslation("settings");

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight text-foreground">
					{t("title")}
				</h1>
				<p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
			</div>

			<section className="flex flex-col gap-4">
				<h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("sections.appearance")}
				</h2>
				<ThemePresetSelector />
			</section>

			<section className="flex flex-col gap-4">
				<h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("sections.preferences")}
				</h2>
				<LanguageSettingRow />
			</section>

			<section className="flex flex-col gap-4">
				<h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("sections.integrations")}
				</h2>
				<SpotifyConnectCard />
				<SpotifyNowPlayingCard />
			</section>
		</div>
	);
}

export default SettingsPage;
