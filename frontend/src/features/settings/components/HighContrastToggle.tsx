import { useTranslation } from "react-i18next";
import { Switch } from "@/core/components/ui/switch";
import { useThemeUIStore } from "../store/theme-ui.store";

export function HighContrastToggle() {
	const { t } = useTranslation("settings");
	const contrast = useThemeUIStore((state) => state.contrast);
	const setContrast = useThemeUIStore((state) => state.setContrast);
	const checked = contrast === "high";

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border-subtle bg-surface-low p-4">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-medium text-foreground">
					{t("contrast.label")}
				</span>
				<span className="text-xs text-muted-foreground">
					{t("contrast.description")}
				</span>
			</div>

			<Switch
				checked={checked}
				onCheckedChange={(value) => setContrast(value ? "high" : "standard")}
				aria-label={t("contrast.label")}
			/>
		</div>
	);
}
